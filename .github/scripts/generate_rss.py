#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = REPO_ROOT / "feed.xml"
SITE_URL = os.environ.get("SITE_URL", "https://lxtus.online")
REPO_URL = os.environ.get("REPO_URL", "https://github.com/ratfem/DJ-blog")
FEED_TITLE = os.environ.get("FEED_TITLE", "ratpetals updates")


def run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=REPO_ROOT, text=True).strip()


def format_rfc2822(value: str) -> str:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed.strftime("%a, %d %b %Y %H:%M:%S %z")


def build_feed() -> str:
    log_output = run_git(["log", "-n", "15", "--date=iso-strict", "--pretty=format:%H%x09%aI%x09%s"])
    items: list[str] = []

    for line in log_output.splitlines():
        if not line:
            continue
        sha, date_str, subject = line.split("\t", 2)
        pub_date = format_rfc2822(date_str)
        escaped_title = escape(subject)
        escaped_desc = escape(f"Website update: {subject}")
        items.append(
            """    <item>
      <title>{title}</title>
      <link>{link}</link>
      <guid>{link}</guid>
      <pubDate>{pub_date}</pubDate>
      <description>{description}</description>
    </item>""".format(
                title=escaped_title,
                link=f"{REPO_URL}/commit/{sha}",
                pub_date=pub_date,
                description=escaped_desc,
            )
        )

    last_build_date = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
    items_block = "\n".join(items)
    body = f"""<?xml version=\"1.0\" encoding=\"utf-8\"?>
<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">
  <channel>
    <title>{escape(FEED_TITLE)}</title>
    <link>{SITE_URL}/</link>
    <description>Recent updates from ratpetals' website.</description>
    <language>en-us</language>
    <lastBuildDate>{last_build_date}</lastBuildDate>
    <atom:link href=\"{SITE_URL}/feed.xml\" rel=\"self\" type=\"application/rss+xml\" />
{items_block}
  </channel>
</rss>
"""
    return body.replace("{items_block}", items_block)


if __name__ == "__main__":
    OUTPUT_PATH.write_text(build_feed(), encoding="utf-8")
