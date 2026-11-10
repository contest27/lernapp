"""Command-line gate for the browser test page: serves app/ with tools/serve.py on
a free port, loads tests/tests.html in headless Edge (or Chrome), reads the
summary line the page renders and exits 0 only on a real green run.

    python tools/run_tests.py [--timeout S]

Exit codes: 0 every test passed
            1 at least one test failed (the failures are listed)
            2 no verdict: no browser, the server did not start, the page did
              not finish (hung, crashed, timed out) or reported zero tests

Free and offline: the browser loads only the local server. Standard library
only; the page stays the test runner, this script only drives it.
"""
import argparse
import html
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERVE = ROOT / "tools" / "serve.py"
WINDOWS = os.name == "nt"

SUMMARY = re.compile(r'<div id="summary"[^>]*>(.*?)</div>', re.S)
COUNTS = re.compile(r"TESTS: (\d+) passed, (\d+) failed \((\d+) total\)")
LINE = re.compile(r'<div class="(pass|fail)">(.*?)</div>', re.S)


def find_browsers():
    """Every Edge/Chrome on the machine, Edge first.

    More than one, because a browser can stop dumping without failing: on
    2026-11-10 headless Edge exited 0 with an EMPTY DOM for any page (no stderr
    either), while headless Chrome on the same page worked. An empty dump falls
    through to the next browser instead of ending the run without a verdict."""
    pf86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
    pf = os.environ.get("ProgramFiles", r"C:\Program Files")
    found = []
    for p in (rf"{pf86}\Microsoft\Edge\Application\msedge.exe",
              rf"{pf}\Microsoft\Edge\Application\msedge.exe",
              rf"{pf}\Google\Chrome\Application\chrome.exe",
              rf"{pf86}\Google\Chrome\Application\chrome.exe"):
        if os.path.isfile(p):
            found.append(p)
    for name in ("msedge", "microsoft-edge", "google-chrome", "chromium", "chrome"):
        w = shutil.which(name)
        if w and w not in found:
            found.append(w)
    return found


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def kill_tree(p):
    # Edge runs a tree of processes; killing only the parent leaves renderers behind.
    if WINDOWS:
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)],
                       stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)
    else:
        p.kill()


def wait_until_served(srv, url, deadline):
    while time.monotonic() < deadline:
        if srv.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except OSError:
            time.sleep(0.2)
    return False


def wait_for_dump(edge, path, deadline):
    """True once the browser has exited or has written the whole DOM."""
    while time.monotonic() < deadline:
        if edge.poll() is not None or path.read_bytes().rstrip().endswith(b"</html>"):
            return True
        time.sleep(0.2)
    return False


def no_verdict(msg, log=None):
    print(f"run_tests: NO VERDICT - {msg}")
    if log and log.strip():
        print("browser stderr (tail):")
        print("\n".join(log.strip().splitlines()[-15:]))
    return 2


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--timeout", type=float, default=120.0,
                    help="wall-clock limit for the browser run in seconds (default 120)")
    a = ap.parse_args()
    # Test names carry non-ASCII; a redirected stdout on Windows is cp1252.
    sys.stdout.reconfigure(errors="replace")

    browsers = find_browsers()
    if not browsers:
        return no_verdict("no Edge or Chrome found")

    work = Path(tempfile.mkdtemp(prefix="lernapp-tests-"))
    port = free_port()
    url = f"http://127.0.0.1:{port}/tests/tests.html"
    srv = edge = None
    t0 = time.monotonic()
    try:
        with open(work / "server.log", "wb") as slog:
            srv = subprocess.Popen([sys.executable, str(SERVE), str(port)], cwd=ROOT,
                                   stdin=subprocess.DEVNULL, stdout=slog, stderr=slog)
        if not wait_until_served(srv, url, time.monotonic() + 15):
            return no_verdict(f"tools/serve.py did not serve {url}")

        dom = log = ""
        for i, browser in enumerate(browsers):
            # Output goes to files, not pipes: a killed parent's children would hold a pipe open.
            out_path, err_path = work / f"dom{i}.html", work / f"stderr{i}.log"
            with open(out_path, "wb") as out, open(err_path, "wb") as err:
                edge = subprocess.Popen(
                    [browser, "--headless=new", "--disable-gpu", "--no-first-run",
                     "--no-default-browser-check", "--disable-extensions",
                     f"--user-data-dir={work / f'profile{i}'}",
                     # Virtual time pauses while fetches are pending and skips idle
                     # waits, so the async tests finish before the DOM is dumped.
                     "--virtual-time-budget=60000", "--dump-dom", url],
                    stdin=subprocess.DEVNULL, stdout=out, stderr=err)
                if not wait_for_dump(edge, out_path, time.monotonic() + a.timeout):
                    kill_tree(edge)
                    edge.wait(timeout=30)
                    return no_verdict(f"browser did not finish within {a.timeout:g} s (killed)")
            if edge.poll() is None:
                # The DOM is out, but Edge now and then hangs in its own shutdown
                # afterwards (only its crashpad handler left); the run is over.
                kill_tree(edge)
                edge.wait(timeout=30)
            dom = out_path.read_bytes().decode("utf-8", "replace")
            log = err_path.read_bytes().decode("utf-8", "replace")
            if dom.strip():
                break
            print(f"run_tests: {Path(browser).stem} dumped nothing - trying the next browser")

        m = SUMMARY.search(dom)
        summary = html.unescape(m.group(1)).strip() if m else ""
        c = COUNTS.search(summary)
        if not c:
            return no_verdict(f"page reported no result (summary: {summary or 'missing'!r}, "
                              f"browser exit {edge.returncode})", log)
        passed, failed, total = map(int, c.groups())
        lines = LINE.findall(dom)
        if total == 0:
            return no_verdict("page ran zero tests")
        if passed + failed != total or len(lines) != total:
            return no_verdict(f"summary says {total} tests but the page lists {len(lines)}")

        for kind, text in lines:
            if kind == "fail":
                print("FAIL " + html.unescape(text).lstrip("✗ ").strip())
        verdict = "RED" if failed else "PASS"
        print(f"run_tests: {verdict} - {passed} passed, {failed} failed ({total} total) "
              f"in {time.monotonic() - t0:.1f} s [{Path(browser).stem}]")
        return 1 if failed else 0
    finally:
        if edge and edge.poll() is None:
            kill_tree(edge)
        if srv and srv.poll() is None:
            srv.terminate()
            try:
                srv.wait(timeout=5)
            except subprocess.TimeoutExpired:
                srv.kill()
        for _ in range(10):  # the browser releases its profile files a moment after exit
            shutil.rmtree(work, ignore_errors=True)
            if not work.exists():
                break
            time.sleep(0.3)


if __name__ == "__main__":
    sys.exit(main())
