import process from "node:process";
import { fonnteService } from "../services/fonnte";

async function run() {
  // When executed via `tsx`, process.argv usually looks like:
  // [node, tsxBin, scriptPath, ...args]
  // When executed via `node`, process.argv looks like:
  // [node, scriptPath, ...args]
  let args = process.argv.slice(2);
  if (args[0]?.endsWith(".ts") || args[0]?.endsWith(".js")) {
    args = args.slice(1);
  }
  if (args[0] === "--") {
    args = args.slice(1);
  }

  const [target, ...messageParts] = args;
  const message = messageParts.join(" ").trim();

  if (!target || !message) {
    console.error(
      "Usage: pnpm --filter backend fonnte:smoke -- <target> <message>",
    );
    process.exit(1);
  }

  const response = await fonnteService.sendMessage(target, message);
  console.log("[Fonnte smoke] Message sent successfully.", response);
}

run().catch((error) => {
  console.error("[Fonnte smoke] Failed:", error);
  process.exit(1);
});
