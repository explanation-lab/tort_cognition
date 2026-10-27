/* Freeze the approved Console client and generate the official setup manifest.
   Story assets are represented by their content hashes in configuration.js. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const consoleRoot=process.argv[2]||process.env.TORT_CONSOLE_ROOT;
if(!consoleRoot)throw Error('Pass the current Study Console source directory.');
const {inspectStudyZip,convertStudyZip}=await import(pathToFileURL(path.resolve(consoleRoot,'lib/study-converter.ts')));
const {zipSync,unzipSync}=createRequire(path.resolve(consoleRoot,'package.json'))('fflate');
const entry='code/experiments/experiment2/adults-consent-check';
const files={};
for(const relative of [entry+'/index.html',entry+'/js/study.js',entry+'/js/configuration.js',entry+'/js/consent-runtime.js',
 'code/shared/css/jspsych-7.3.4.css',...['jspsych-7.3.4.js','plugin-html-button-response-1.1.3.js','pilot-adult-forms.js'].map(n=>'code/shared/js/'+n)])
 files[relative]=fs.readFileSync(path.join(root,relative));
const inspection=await inspectStudyZip(new File([zipSync(files)],'adult-consent-check-native-source.zip'));
if(inspection.outcome!=='ready'||inspection.assignmentType!=='between_participant')
 throw Error(JSON.stringify({outcome:inspection.outcome,assignmentType:inspection.assignmentType,blockers:inspection.blockers}));
const client=fs.readFileSync(path.join(root,entry,'js/explanation-lab-client.js'),'utf8');
const result=await convertStudyZip(inspection,{experimentVersion:'adult-consent-check-1.0.0',
 conditionCodes:['consent','no_consent'],demographicFields:['age','gender','race','ethnicity','state'],
 noDemographics:false,assignmentType:'between_participant'},client);
const output=unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
if(Buffer.from(output[inspection.integration.scriptPath]).toString()!==fs.readFileSync(path.join(root,entry,'js/study.js'),'utf8')){
 const candidate=path.join(root,'code/tools/generated/consent-check-console-script-candidate.js');
 fs.mkdirSync(path.dirname(candidate),{recursive:true});
 fs.writeFileSync(candidate,output[inspection.integration.scriptPath]);
 throw Error('Inspect converter entry '+inspection.integration.scriptPath+' against study.js; candidate saved to '+candidate);
}
for(const name of ['explanation-lab.config.json','explanation-lab-client.js'])
 fs.writeFileSync(path.join(root,entry,name==='explanation-lab-client.js'?'js/'+name:name),name==='explanation-lab-client.js'?Buffer.from(client):output[name]);
console.log(JSON.stringify({version:result.config.experimentVersion,conditions:result.config.launchConditions,
 assignmentType:result.config.assignmentType,fingerprint:result.config.packageFingerprint,clientVersion:result.config.clientVersion}));
