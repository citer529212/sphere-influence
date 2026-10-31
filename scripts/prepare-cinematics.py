"""Create three complete opening movies from the user's five clips (requires FFmpeg)."""
from pathlib import Path
import argparse, hashlib, json, subprocess, unicodedata

parser=argparse.ArgumentParser()
parser.add_argument('input',type=Path,help='Directory containing the five original MP4 clips')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
out=root/'public'/'cinematics'
out.mkdir(parents=True,exist_ok=True)
files={unicodedata.normalize('NFC',p.name):p for p in args.input.glob('*.mp4')}
names=['вступления_1.mp4','2 порвали.mp4','синий финал.mp4','красный финал.mp4','желтый финал.mp4']
sources=[files[name] for name in names]
def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-show_streams','-of','json',str(path)]))
first_duration=float(probe(sources[0])['format']['duration'])
overlap=.3
join=first_duration-overlap
# Keep the first clip silent; preserve the original audio in the remaining clips.
for faction,branch in zip(['atlas','meridian','concordat'],sources[2:]):
    target=out/f'intro-{faction}.mp4'
    filters=(f'[0:v]fps=24,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v0];'
             f'[1:v]fps=24,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v1];'
             f'[2:v]fps=24,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v2];'
             f'[v0][v1]xfade=transition=fade:duration={overlap}:offset={join}[common];'
             f'[common][v2]concat=n=2:v=1:a=0[v];'
             f'anullsrc=r=48000:cl=stereo,atrim=duration={first_duration},asetpts=PTS-STARTPTS[a0];'
             f'[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a1];'
             f'[2:a]aformat=sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a2];'
             f'[a0][a1]acrossfade=d={overlap}:c1=tri:c2=tri[ac];'
             f'[ac][a2]concat=n=2:v=0:a=1[a]')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
        '-i',str(sources[0]),'-i',str(sources[1]),'-i',str(branch),
        '-filter_complex_threads','1','-filter_complex',filters,'-map','[v]','-map','[a]',
        '-c:v','libx264','-preset','medium','-crf','23','-threads','2','-profile:v','high','-pix_fmt','yuv420p',
        '-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(target)],check=True)
    meta=probe(target)
    print(f'{target.name}: {float(meta["format"]["duration"]):.2f}s, {target.stat().st_size/1024/1024:.2f} MB',flush=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','0.1','-i',str(sources[0]),'-frames:v','1','-vf','scale=960:-1','-q:v','3',str(out/'intro-poster.jpg')],check=True)
metadata={'transition':{'type':'dissolve','seconds':overlap},'chapters':[0,join,join+8],'sources':[{'file':unicodedata.normalize('NFC',p.name),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':float(probe(p)['format']['duration'])} for p in sources]}
(out/'source-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
