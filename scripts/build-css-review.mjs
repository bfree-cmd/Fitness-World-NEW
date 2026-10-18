/** Rebuild on a separate worktree: node scripts/build-css-review.mjs BASE_COMMIT
 * Dependencies: purgecss 8.0.0, lightningcss 1.29.2, postcss 8.5.30,
 * postcss-selector-parser 7.1.6. Never run over uncommitted HTML edits.
 */
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync}from'node:child_process';import {PurgeCSS}from'purgecss';import {transform}from'lightningcss';import postcss from'postcss';import parser from'postcss-selector-parser';
const base=process.argv[2];if(!base)throw Error('Pass the baseline commit to rebuild from');
const source=p=>execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8',maxBuffer:8*1024*1024});
const files=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n');
const content=files.filter(p=>/\.(html|js|json)$/.test(p)&&!p.startsWith('docs/')&&!p.startsWith('reports/')).map(p=>({raw:source(p),extension:path.extname(p).slice(1)}));
const original=source('assets/css/site.css');
// Browsers already recover from the legacy unmatched braces. Use parser recovery,
// then verify the output with full-page image and layout comparisons.
const recovered=transform({code:Buffer.from(original),minify:false,errorRecovery:true});
const result=(await new PurgeCSS().purge({content,css:[{raw:Buffer.from(recovered.code).toString()}],safelist:{standard:[/^(is-|has-|js-|no-js|active$|open$|show$|hidden$|expanded$|selected$|loading$|error$|success$|visible$|collapsed$|ready$)/],greedy:[/aria-/,/data-/]},fontFace:false,keyframes:false,variables:false,rejected:true}))[0];
const names=['pdf-previews','connect','discussion-compact','spacing-polish','visual-audit-polish'];let combined=result.css,polishBytes=0;
for(const name of names){const css=source('assets/css/'+name+'.css');polishBytes+=Buffer.byteLength(css);const tree=postcss.parse(css);tree.walkRules(rule=>{if(rule.parent.type==='atrule'&&/keyframes/.test(rule.parent.name))return;rule.selector=parser(selectors=>selectors.each(sel=>{const gate=parser().astSync(':where(html[data-fw-polish~="'+name+'"],html[data-fw-polish~="'+name+'"] *)').first.first;const pseudo=sel.nodes.find(n=>n.type==='pseudo'&&n.value.startsWith('::'));if(pseudo)sel.insertBefore(pseudo,gate);else sel.append(gate);})).processSync(rule.selector);});combined+='\n'+tree.toString();}
const final=transform({code:Buffer.from(combined),minify:true,errorRecovery:true});await fs.writeFile('assets/css/site.css',final.code);
let htmlCount=0;
for(const p of files.filter(p=>p.endsWith('.html'))){let s=source(p),flags=[];s=s.replace(/<link\b[^>]*>/g,tag=>{for(const n of names)if(tag.includes('/assets/css/'+n+'.css')){flags.push(n);return'';}return tag;});if(flags.length)s=s.replace(/<html\b/,'<html data-fw-polish="'+[...new Set(flags)].join(' ')+'"');if(s.includes('/assets/css/site.css')){s=s.replace(/\/assets\/css\/site\.css(?:\?[^"\s<>]*)?/g,'/assets/css/site.css?v=20261018-purge-review');htmlCount++;}await fs.writeFile(p,s);}
const report={baseline:base,htmlPages:htmlCount,contentFiles:content.length,originalMainBytes:Buffer.byteLength(original),originalPolishBytes:polishBytes,finalMainBytes:final.code.length,removedSelectors:result.rejected.length,recoveryWarnings:recovered.warnings.length,polishFiles:names,notes:['Five polish styles are gated by the pages that originally loaded each file. :where adds no specificity.','Variables, keyframes and font faces are retained. Runtime state and data selectors are safelisted.','No production merge until owner review. Rebuild against current main after other CSS or font changes merge.']};await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/css-purge-review.json',JSON.stringify(report,null,2)+'\n');console.log(report);
