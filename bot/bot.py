"""Discord bot entry point for LumaWarden."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import discord
from discord.ext import commands, tasks

from messages import (
	PERSONALITIES,
	format_alarm,
	format_room,
	format_status,
	format_summary,
	format_usage,
	get_personality,
	normalize_room_name,
)

DEFAULT_API_BASE = "http://127.0.0.1:8000"
DEFAULT_ALERT_INTERVAL_SECONDS = 300


class BackendClient:
	"""Small async wrapper around the LumaWarden REST API."""

	def __init__(self, base_url: str) -> None:
		self.base_url = base_url.rstrip("/")

	async def get_snapshot(self) -> dict[str, Any]:
		return await self._get_json("/api/snapshot")

	async def get_summary(self) -> dict[str, Any]:
		return await self._get_json("/api/summary")

	async def _get_json(self, path: str) -> dict[str, Any]:
		url = f"{self.base_url}{path}"
		return await asyncio.to_thread(self._blocking_get_json, url)

	@staticmethod
	def _blocking_get_json(url: str) -> dict[str, Any]:
		request = Request(url, headers={"Accept": "application/json"})
		with urlopen(request, timeout=5) as response:
			return json.loads(response.read().decode("utf-8"))


class LumaWardenCog(commands.Cog):
	def __init__(self, bot: commands.Bot, api: BackendClient, channel_id: int | None, personality_name: str) -> None:
		self.bot = bot
		self.api = api
		self.channel_id = channel_id
		self.personality = get_personality(personality_name)
		self.last_alarm_signature: str | None = None

		interval = int(os.getenv("AUTO_ALERT_INTERVAL_SECONDS", str(DEFAULT_ALERT_INTERVAL_SECONDS)))
		self.after_hours_alarm_loop.change_interval(seconds=max(10, interval))
		self.after_hours_alarm_loop.start()

	def cog_unload(self) -> None:
		self.after_hours_alarm_loop.cancel()

	async def _safe_snapshot(self, ctx: commands.Context | None = None) -> dict[str, Any] | None:
		try:
			return await self.api.get_snapshot()
		except (URLError, TimeoutError, OSError) as exc:
			message = f"I could not reach the LumaWarden backend at `{self.api.base_url}`. Start the backend first."
			if ctx is not None:
				await ctx.reply(message)
			logging.warning("Backend snapshot request failed: %s", exc)
			return None

	async def _safe_summary(self, ctx: commands.Context | None = None) -> dict[str, Any] | None:
		try:
			return await self.api.get_summary()
		except (URLError, TimeoutError, OSError) as exc:
			message = f"I could not read the summary from `{self.api.base_url}`."
			if ctx is not None:
				await ctx.reply(message)
			logging.warning("Backend summary request failed: %s", exc)
			return None

	@commands.command(name="status")
	async def status_command(self, ctx: commands.Context, *, room_name: str = "") -> None:
		"""Show office-wide status, or a room status when a room name is provided."""

		snapshot = await self._safe_snapshot(ctx)
		if snapshot is None:
			return

		if room_name.strip():
			room = normalize_room_name(room_name)
			if room is None:
				await ctx.reply("I know these rooms: `drawing`, `work1`, and `work2`.")
				return

			await ctx.reply(format_room(snapshot, room, self.personality))
			return

		await ctx.reply(format_status(snapshot, self.personality))

	@commands.command(name="room")
	async def room_command(self, ctx: commands.Context, *, room_name: str) -> None:
		"""Show status for one room."""

		room = normalize_room_name(room_name)
		if room is None:
			await ctx.reply("I know these rooms: `drawing`, `work1`, and `work2`.")
			return

		snapshot = await self._safe_snapshot(ctx)
		if snapshot is None:
			return
		await ctx.reply(format_room(snapshot, room, self.personality))

	@commands.command(name="usage")
	async def usage_command(self, ctx: commands.Context) -> None:
		"""Show live power usage."""

		snapshot = await self._safe_snapshot(ctx)
		summary = await self._safe_summary(ctx)
		if snapshot is None or summary is None:
			return
		await ctx.reply(format_usage(snapshot, summary, self.personality))

	@commands.command(name="summary")
	async def summary_command(self, ctx: commands.Context) -> None:
		"""Show previous day's after-hours wasted energy."""

		summary = await self._safe_summary(ctx)
		if summary is None:
			return
		await ctx.reply(format_summary(summary, self.personality))

	@commands.command(name="personalities")
	async def personalities_command(self, ctx: commands.Context) -> None:
		"""List available bot response styles."""

		names = ", ".join(f"`{name}`" for name in sorted(PERSONALITIES))
		await ctx.reply(f"Available personalities: {names}")

	@commands.command(name="persona")
	async def persona_command(self, ctx: commands.Context, name: str) -> None:
		"""Switch bot response style for the current process."""

		normalized = name.strip().lower()
		if normalized not in PERSONALITIES:
			await ctx.reply("Unknown personality. Try `!personalities`.")
			return

		self.personality = get_personality(normalized)
		await ctx.reply(f"Personality switched to `{self.personality.name}`.")

	@tasks.loop(seconds=DEFAULT_ALERT_INTERVAL_SECONDS)
	async def after_hours_alarm_loop(self) -> None:
		await self.bot.wait_until_ready()
		if self.channel_id is None:
			return

		snapshot = await self._safe_snapshot()
		if snapshot is None:
			return

		signature, message = format_alarm(snapshot, self.personality)
		if signature is None:
			self.last_alarm_signature = None
			return

		if signature == self.last_alarm_signature:
			return

		channel = self.bot.get_channel(self.channel_id)
		if channel is None:
			channel = await self.bot.fetch_channel(self.channel_id)

		if hasattr(channel, "send"):
			await channel.send(message)
			self.last_alarm_signature = signature


async def main() -> None:
	logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

	token = os.getenv("DISCORD_TOKEN")
	if not token:
		raise SystemExit("Set DISCORD_TOKEN before running the bot.")

	channel_id_value = os.getenv("DISCORD_CHANNEL_ID")
	channel_id = int(channel_id_value) if channel_id_value else None
	api_base = os.getenv("LUMAWARDEN_API_BASE", DEFAULT_API_BASE)
	personality_name = os.getenv("BOT_PERSONALITY", "warden")

	intents = discord.Intents.default()
	intents.message_content = True

	bot = commands.Bot(command_prefix="!", intents=intents)
	await bot.add_cog(LumaWardenCog(bot, BackendClient(api_base), channel_id, personality_name))
	await bot.start(token)


if __name__ == "__main__":
	asyncio.run(main())
