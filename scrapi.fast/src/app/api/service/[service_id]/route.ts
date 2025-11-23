import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, Service } from "@/db";

export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ service_id: string }> },
) {
  const { service_id } = await params;

  const service = await db.query.Service.findFirst({
    where: eq(Service.id, service_id),
  });

  if (!service) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  if (!service.script) {
    return Response.json({ error: "Service has no script" }, { status: 400 });
  }

  const input = await request.json();

  try {
    if (service.schema_input) {
      const createInputSchema = new Function(
        "z",
        `return ${service.schema_input}`,
      );
      const inputSchema = createInputSchema(z);
      const validation = inputSchema.safeParse(input);
      if (!validation.success) {
        return Response.json(
          {
            error: "Input validation failed",
            details: validation.error.message,
          },
          { status: 400 },
        );
      }
    }

    const cleanedScript = service.script
      .replace(/^import.*$/gm, "")
      .replace(/export\s+async\s+function/, "async function");

    const wrappedScript = `
      ${cleanedScript}
      return getData;
    `;

    const getDataFn = new Function(wrappedScript)();
    const result = await getDataFn(input);

    if (service.schema_output) {
      const createOutputSchema = new Function(
        "z",
        `return ${service.schema_output}`,
      );
      const outputSchema = createOutputSchema(z);
      const validation = outputSchema.safeParse(result);
      if (!validation.success) {
        return Response.json(
          {
            error: "Output validation failed",
            details: validation.error.message,
            result,
          },
          { status: 500 },
        );
      }
    }

    return Response.json({ data: result });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
