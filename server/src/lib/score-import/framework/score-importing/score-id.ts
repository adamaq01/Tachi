import db from "external/mongo/db";
import fjsh from "fast-json-stable-hash";
import { GetGPTConfig } from "tachi-common";
import type { DryScore } from "../common/types";
import type { integer, GPTString, ProvidedMetrics, OptionalMetrics } from "tachi-common";

/**
 * Creates an identifier for this score.
 * This is used to deduplicate repeated scores.
 * @returns @see HashScoreIDString - prefixed with R.
 */
export function CreateScoreID(
	gptString: GPTString,
	userID: integer,
	dryScore: DryScore,
	chartID: string
) {
	const elements: Record<string, number | string> = { userID, chartID };

	const gptConfig = GetGPTConfig(gptString);

	for (const m of Object.keys(gptConfig.providedMetrics)) {
		const metric = m as keyof ProvidedMetrics[GPTString];

		elements[metric] = dryScore.scoreData[metric];
	}

	// Also include optional metrics in the checksum if they should be
	// part of the scoreID.
	for (const [m, conf] of Object.entries(gptConfig.optionalMetrics)) {
		const metric = m as keyof OptionalMetrics[GPTString];

		if (conf.partOfScoreID) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			elements[`optional.${metric}`] = dryScore.scoreData.optional[metric] ?? null;
		}
	}

	// use a stable object hashing method instead of string joining
	// as it's immune to key order or anything screwy like that.
	const hash = fjsh.hash(elements, "sha256");

	return `T${hash}`;
}

export function GetWithScoreID(scoreID: string) {
	return db.scores.findOne({
		scoreID,
	});
}
