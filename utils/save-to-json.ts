// lib/utils/file-utils.ts
import fs from "fs";
import path from "path";

export async function saveToJsonFile(
	data: any,
	filename: string = `eprocure_data_${Date.now()}.json`
): Promise<void> {
	const outputDir = path.join(process.cwd(), "output");

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const filePath = path.join(outputDir, filename);
	const jsonData = JSON.stringify(data, null, 2);

	fs.writeFileSync(filePath, jsonData, "utf8");
	console.log(`💾 Data saved to: ${filePath}`);
}
