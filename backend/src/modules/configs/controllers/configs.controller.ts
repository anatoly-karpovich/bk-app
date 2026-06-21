import type { Request, Response } from "express";
import { getConfigById, listConfigs } from "../services/configs.service";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function getSingleRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export async function getConfigs(_req: Request, res: Response) {
  try {
    const configs = await listConfigs();

    return res.status(200).json({
      success: true,
      data: configs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load configs",
      error: getErrorMessage(error),
    });
  }
}

export async function getConfig(req: Request, res: Response) {
  const configId = getSingleRouteParam(req.params.configId);

  if (!configId) {
    return res.status(400).json({
      success: false,
      message: "Route parameter 'configId' is required",
    });
  }

  try {
    const config = await getConfigById(configId);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Config not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load config",
      error: getErrorMessage(error),
    });
  }
}
