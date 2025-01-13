import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as fsp from 'fs/promises';
import archiver from "archiver";

const TEMP_DIR = path.join(os.tmpdir(), 'label-studio-images');
const DIST_DIR = path.join(__dirname, "../", 'data');
const ZIP_NAME = 'images.zip';

async function main() {
  try {
    // Ensure directories exist
    await fsp.mkdir(TEMP_DIR, { recursive: true });
    await fsp.mkdir(DIST_DIR, { recursive: true });

    // Read the label-studio-export.json file
    const filePath = path.join(__dirname, "../", "data", 'label-studio-export.json');
    const fileContent = await fsp.readFile(filePath, 'utf-8');
    const exportData = JSON.parse(fileContent);

    // Check if the export is an array
    if (!Array.isArray(exportData)) {
      throw new Error('label-studio-export.json must contain an array.');
    }

    // Copy images to temporary folder
    for (const item of exportData) {
      const imageUrl = os.homedir() + '/' + item?.data?.url.replace('/data/local-files/?d=', '');

      if (typeof imageUrl !== 'string') {
        console.warn('Skipping item due to invalid data.url:', item);
        continue;
      }

      const fileName = path.basename(imageUrl);
      const destPath = path.join(TEMP_DIR, fileName);

      // Copy image file
      try {
        await fsp.copyFile(imageUrl, destPath);
        console.log(`Copied: ${fileName}`);
      } catch (error) {
        // @ts-ignore
        console.error(`Failed to copy ${imageUrl}:`, error.message);
      }
    }

    // Create a zip archive
    const zipPath = path.join(DIST_DIR, ZIP_NAME);
    await createZip(TEMP_DIR, zipPath);
    console.log(`Created zip archive: ${zipPath}`);

    // Clean up the temporary folder
    await fsp.rm(TEMP_DIR, { recursive: true, force: true });
    console.log('Temporary folder deleted.');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function createZip(sourceDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => resolve());
    archive.on('error', (err: any) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false); // Add all files in the directory
    archive.finalize();
  });
}

main();