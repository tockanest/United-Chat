import {readFile} from 'fs/promises';
import {join} from 'path';

export async function readHtmlFile(fileName: string): Promise<string> {
	const filePath = join(process.env.APPDATA || '', 'United Chat', 'styles', `${fileName}.html`);
	return await readFile(filePath, 'utf-8');
}