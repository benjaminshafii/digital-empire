import { spawnSync } from "node:child_process";

export type ExecOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export function exec(command: string, args: string[], options: ExecOptions = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    const stdout = result.stdout?.toString() ?? "";
    throw new Error(
      [`Command failed: ${command} ${args.join(" ")}`, stdout.trim(), stderr.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return {
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
  };
}

export function readKeychainValue(service: string, account: string) {
  try {
    const { stdout } = exec("security", ["find-generic-password", "-a", account, "-s", service, "-w"]);
    return stdout.trim();
  } catch {
    return null;
  }
}
