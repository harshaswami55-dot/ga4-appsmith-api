from __future__ import annotations

import sys

from generate_weekly_manager_report import main


if __name__ == "__main__":
    sys.argv.extend(["--cadence", "monthly"])
    raise SystemExit(main())
