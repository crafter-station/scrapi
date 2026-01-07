import { z } from "zod";
import { apiRatelimit, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rateLimitResponse = await checkRateLimit(apiRatelimit, `ip:${ip}`);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();
  const { inputSchemaString, outputSchemaString, testArgsString, script } =
    body;

  console.log("=== run-test API called ===");
  console.log("inputSchemaString:", inputSchemaString);
  console.log("outputSchemaString:", outputSchemaString);
  console.log("testArgsString:", testArgsString);
  console.log("script length:", script?.length);
  console.log("script preview:", script?.substring(0, 200));

  try {
    console.log("Creating input schema...");
    const createInputSchema = new Function("z", `return ${inputSchemaString}`);
    const createOutputSchema = new Function(
      "z",
      `return ${outputSchemaString}`,
    );

    const inputSchema = createInputSchema(z);
    console.log("Input schema created");
    const outputSchema = createOutputSchema(z);
    console.log("Output schema created");

    console.log("Parsing test args...");
    const testArgs = new Function(`return ${testArgsString}`)();
    console.log("Test args:", testArgs);

    console.log("Cleaning script...");
    const cleanedScript = script
      .replace(/^import.*$/gm, "")
      .replace(/export\s+async\s+function/, "async function");

    console.log("Cleaned script preview:", cleanedScript.substring(0, 300));

    const wrappedScript = `
      ${cleanedScript}
      return getData;
    `;

    console.log("Creating getData function...");
    const getDataFn = new Function(wrappedScript)();
    console.log("getData function created");

    const capturedLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      capturedLogs.push(
        args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" "),
      );
      originalLog(...args);
    };

    let result: unknown;
    try {
      console.log("Executing getData...");
      result = await getDataFn(testArgs);
    } finally {
      console.log = originalLog;
    }

    const resultString = JSON.stringify(result, null, 2);
    console.log("Result:", resultString);

    const validation = outputSchema.safeParse(result);
    const passed = validation.success;
    const returnedEmpty = Array.isArray(result) && result.length === 0;

    console.log("Validation passed:", passed);
    console.log("Returned empty:", returnedEmpty);

    const logsOutput =
      capturedLogs.length > 0
        ? `Console output:\n${capturedLogs.join("\n")}\n\n`
        : "";

    return Response.json({
      testResult: `${logsOutput}Result: ${resultString}`,
      passed: passed && !returnedEmpty,
      returnedEmpty,
      validationError: validation.success ? null : validation.error.message,
    });
  } catch (error) {
    console.error("Error in run-test:", error);
    return Response.json({
      testResult: error instanceof Error ? error.message : String(error),
      passed: false,
      returnedEmpty: false,
    });
  }
}
