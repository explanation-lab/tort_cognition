"""Build a local CHS candidate from a saved design; never save/upload to CHS."""
from pathlib import Path
import argparse, hashlib, json

ROOT=Path(__file__).resolve().parents[2]
PARTS=ROOT/'code/shared/child-warmup-feedback/v1'

def patch_runtime(original):
    if 'function createWarmupFeedback(' in original:
        raise ValueError('Feedback already present; refusing a second application')
    def once(old,new):
        nonlocal original
        if original.count(old)!=1:
            raise ValueError('Saved runtime differs at patch anchor: '+old[:90])
        original=original.replace(old,new,1)
    once('  /* Conservative fit adjustments', (PARTS/'feedback.css').read_text()+'  /* Conservative fit adjustments')
    once('    function rating(s,position,construct,practice,explanation=false,second=false) {', (PARTS/'feedback.js').read_text()+'    function rating(s,position,construct,practice,explanation=false,second=false) {')
    once('        let autoPending=false;\n        function check(){btn.disabled=!valid();', '        let feedback=null;\n        let autoPending=false;\n        function check(){btn.disabled=!valid();')
    once('        function check(){btn.disabled=!valid();', '''        function check(){btn.disabled=!valid();
          if(practice&&options.onPracticeState)options.onPracticeState({construct,practice,values:{...values},touched:{...touched},ready,dragging:!!drag,valid:valid()});
          if(feedback)feedback.render();''')
    once('        const complete=()=>{ready=true;check();};', '''        if(child&&practice)feedback=createWarmupFeedback(ctx,s,construct,practice,()=>({values,touched,ready,dragging:!!drag,valid:valid()}));
        const complete=()=>{ready=true;check();};''')
    once('        function update(who,x){const track=', '        function update(who,x){if(feedback)feedback.interact();const track=')
    return original

def build(saved,baseline,output):
    # The baseline is the exact original runtime verified against the CHS editor.
    baseline=baseline.read_text()
    if hashlib.sha256(baseline.encode()).hexdigest()!='e412c3b5a6f47401bb609e79f473dc6041d86aefd1b0b70231c959a65068aeaf':
        raise ValueError('Unrecognized baseline runtime')
    core=baseline[baseline.index('var TortPilot ='):].strip()
    source=saved.read_text()
    if source.count(core)!=1: raise ValueError('Saved CHS design does not contain the verified baseline exactly once')
    before,after=source.split(core)
    replacement=patch_runtime(core)
    candidate=before+replacement+after
    output.parent.mkdir(parents=True,exist_ok=True); output.write_text(candidate)
    report={'baselineFile':saved.name,'candidateFile':output.name,'originalSHA256':hashlib.sha256(source.encode()).hexdigest(),'candidateSHA256':hashlib.sha256(candidate.encode()).hexdigest(),'outsideRuntimeByteIdentical':True,'preservedPrefixSHA256':hashlib.sha256(before.encode()).hexdigest(),'preservedSuffixSHA256':hashlib.sha256(after.encode()).hexdigest(),'scope':'Child rating practice presentation and recordings only; existing scoring, task rows, save/recovery, admission, wrappers and media config preserved.'}
    output.with_suffix('.audit.json').write_text(json.dumps(report,indent=2)+'\n')
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('saved',type=Path);parser.add_argument('baseline',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();print(json.dumps(build(args.saved,args.baseline,args.output)))
