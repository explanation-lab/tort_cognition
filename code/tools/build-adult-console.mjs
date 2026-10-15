/* Freeze the Console client and generate its official manifest for the native
   repository entry. Large story assets stay shared at their existing paths;
   configuration.js includes their checksums in the source fingerprint. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const consoleRoot=process.argv[2]||process.env.TORT_CONSOLE_ROOT;
if(!consoleRoot)throw Error('Pass the current Study Console source directory.');
const {inspectStudyZip,convertStudyZip}=await import(pathToFileURL(path.resolve(consoleRoot,'lib/study-converter.ts')));
const {zipSync,unzipSync}=createRequire(path.resolve(consoleRoot,'package.json'))('fflate');
const entry='code/experiments/experiment1/adults/between-subjects';
const files={};
for(const relative of [entry+'/index.html',entry+'/study.js',entry+'/configuration.js',
 'code/shared/css/jspsych-7.3.4.css',...['jspsych-7.3.4.js','plugin-html-button-response-1.1.3.js','pilot-runtime.js','pilot-adult-forms.js'].map(n=>'code/shared/js/'+n)])files[relative]=fs.readFileSync(path.join(root,relative));
const inspection=await inspectStudyZip(new File([zipSync(files)],'adult-between-native-source.zip'));
if(inspection.outcome!=='ready'||inspection.assignmentType!=='between_participant')throw Error(JSON.stringify(inspection.blockers));
const client=fs.readFileSync(path.join(consoleRoot,'public/lab-study-client.js'),'utf8');
const result=await convertStudyZip(inspection,{experimentVersion:'adult-between-1.0.0',
 conditionCodes:['victim_not_careless','victim_careless'],demographicFields:['age','gender','race','ethnicity','state'],
 noDemographics:false,assignmentType:'between_participant'},client);
const output=unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
const convertedScript=output[inspection.integration.scriptPath];
if(Buffer.from(convertedScript).toString()!==fs.readFileSync(path.join(root,entry,'study.js'),'utf8'))throw Error('Unexpected converter rewrite; review before updating the native entry.');
for(const name of ['explanation-lab.config.json','explanation-lab-client.js']){
 const source=name==='explanation-lab-client.js'?Buffer.from(client):output[name];
 fs.writeFileSync(path.join(root,entry,name),source);
}
console.log(JSON.stringify({version:result.config.experimentVersion,conditions:result.config.launchConditions,
 fingerprint:result.config.packageFingerprint,clientVersion:result.config.clientVersion}));
