"""Prepare the user's eight local recordings. Requires ffmpeg, ffprobe and numpy.
Usage: python3 scripts/prepare-music.py /path/to/original/mp3s
Originals are read-only. Output and exact edits are recorded in public/music/manifest.json.
"""
from pathlib import Path
import sys, subprocess, json, hashlib, io, wave
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'
OUT=ROOT/'public/music';OUT.mkdir(parents=True,exist_ok=True)
RATE=44100; CROSS=2
# key, original filename, title, ISRC, body source interval, optional celebratory opening
TRACKS=[
 ('menu','Dragon%20and%20Toast','Dragon and Toast','USUAN1100251',(0.5,180.5),None),
 ('atlas','Court%20of%20the%20Queen','Court of the Queen','USUAN1100728',(1,199),None),
 ('meridian','Ishikari%20Lore','Ishikari Lore','USUAN1100192',(1,159),None),
 ('concordat','Digya','Digya','USUAN1200080',(0.2,162.2),None),
 ('victory-atlas','Procession%20of%20the%20King','Procession of the King','USUAN1100745',(48,138),(10,18)),
 ('victory-meridian','Finding%20Movement','Finding Movement','USUAN1100693',(78,114),(32,40)),
 ('victory-concordat','Allada','Allada','USUAN1500001',(48,138),(0,8)),
 ('loss','Sad%20Trio','Sad Trio','USUAN1100089',(5,125),None),
]
def run(args,**kwargs):return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,**kwargs)
def fragment(source,interval):
 # Normalize each selected section with a -20 LUFS target, -2 dBTP ceiling and LRA 11.
 r=run(['ffmpeg','-v','error','-ss',str(interval[0]),'-i',str(source),'-t',str(interval[1]-interval[0]),'-vn','-af','loudnorm=I=-20:TP=-2:LRA=11','-ar',str(RATE),'-ac','2','-f','f32le','-'])
 return np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).copy()
def loop_body(x):
 n=CROSS*RATE;t=(np.arange(n,dtype=np.float32)/n)[:,None]
 # Rotate the start by 2s and blend the last 2s into the removed head.
 return np.concatenate((x[n:-n],x[-n:]*(1-t)+x[:n]*t))
manifest=[]
for key,filename,title,isrc,body,opening in TRACKS:
 source=SOURCE/(filename+'.mp3')
 if not source.exists():raise FileNotFoundError(source)
 probe=json.loads(run(['ffprobe','-v','quiet','-show_format','-of','json',str(source)]).stdout)
 tags=probe['format'].get('tags',{})
 if tags.get('title') not in (title,title+' - Full Mix') or tags.get('artist')!='Kevin MacLeod':raise ValueError(f'Unexpected identity: {source}: {tags}')
 bed=loop_body(fragment(source,body));loop_start=0
 if opening:
  bed*=10**(-4/20) # quieter continuation, distinct from the five-second celebration
  intro=fragment(source,opening);n=CROSS*RATE;t=(np.arange(n,dtype=np.float32)/n)[:,None]
  intro[-n:]=intro[-n:]*(1-t)+bed[-n:]*t
  samples=np.concatenate((intro,bed));loop_start=len(intro)/RATE
 else:samples=bed
 target=OUT/(key+'.mp3')
 run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','-','-map_metadata','-1','-codec:a','libmp3lame','-b:a','128k','-write_xing','1','-metadata',f'title={title} (game edit)','-metadata','artist=Kevin MacLeod','-metadata','copyright=CC BY 4.0; https://creativecommons.org/licenses/by/4.0/',str(target)],input=samples.astype('<f4').tobytes())
 decoded=np.frombuffer(run(['ffmpeg','-v','error','-i',str(target),'-f','f32le','-ac','2','-ar',str(RATE),'-']).stdout,dtype='<f4').reshape(-1,2)
 seam=float(np.max(np.abs(decoded[-1]-decoded[round(loop_start*RATE)])))
 item=dict(key=key,title=title,artist='Kevin MacLeod',isrc=isrc,source=f'https://incompetech.com/music/royalty-free/index.html?isrc={isrc}',license='CC BY 4.0',licenseUrl='https://creativecommons.org/licenses/by/4.0/',original=source.name,originalTitle=tags.get('title'),originalSha256=hashlib.sha256(source.read_bytes()).hexdigest(),originalDuration=float(probe['format']['duration']),bodySourceSeconds=body,openingSourceSeconds=opening,crossfadeSeconds=CROSS,loopStart=loop_start,duration=len(samples)/RATE,bytes=target.stat().st_size,decodedSeamPeak=seam,edits='Selected source excerpts; loudnorm target -20 LUFS / -2 dBTP / LRA 11; 44.1 kHz stereo MP3 128 kbps; removed cover art and original tags; 2-second linear wrap crossfade with rotated loop start.'+(' Opening excerpt retained once; final 2 seconds crossfaded into loop preroll; continuation attenuated 4 dB.' if opening else '') )
 manifest.append(item);print(key,round(item['duration'],2),'s',item['bytes'],'bytes','seam',round(seam,5),flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
