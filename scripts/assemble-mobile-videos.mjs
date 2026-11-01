import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function checkedVideo(parts,record){
 const bytes=Buffer.concat(parts);
 if(bytes.length!==record.bytes||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Mobile video integrity mismatch: '+record.file);
 return bytes;
}
export async function assembleMobileVideos({outputDir=path.join(root,'public/cinematics')}={}){
 const folder=path.join(root,'media/mobile'),records=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
 await mkdir(outputDir,{recursive:true});let written=0;
 for(const record of records){
  if(!/^[a-z-]+-mobile\.mp4$/.test(record.file)||!record.parts.every(p=>/^[a-z-]+-mobile\.\d+\.part$/.test(p)))throw Error('Invalid mobile video manifest');
  const output=path.join(outputDir,record.file);
  try{const current=await readFile(output);if(current.length===record.bytes&&createHash('sha256').update(current).digest('hex')===record.sha256)continue;}catch{/* Generate missing/corrupt outputs from checked repository parts. */}
  const bytes=checkedVideo(await Promise.all(record.parts.map(p=>readFile(path.join(folder,p)))),record);
  await writeFile(output,bytes);written++;
 }
 return {files:records.length,written};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log('Mobile videos:',await assembleMobileVideos());
