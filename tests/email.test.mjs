import test from 'node:test';
import assert from 'node:assert/strict';
import { emailPayload, notifyEnquiry } from '../supabase/functions/submit-enquiry/email.mjs';
const row={id:'test-reference',customer_name:'A <test>',phone:'1234567890',email:'customer@example.com',message:'Details please'};
const config={key:'test-key',from:'store@example.com',to:'epichomezstore@gmail.com'};
test('email uses fixed company recipient and customer Reply-To',()=>{const p=emailPayload(row,config);assert.deepEqual(p.to,[config.to]);assert.equal(p.reply_to,row.email);assert.ok(p.text.includes(row.phone));assert.equal(p.html,undefined)});
test('retry preserves idempotency and payload',async()=>{const calls=[];const status=await notifyEnquiry(row,config,async(url,req)=>{calls.push(req);return {ok:calls.length===2,status:calls.length===2?200:503}});assert.equal(status,'accepted');assert.equal(calls.length,2);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);assert.equal(calls[0].body,calls[1].body)});
test('missing configuration never claims acceptance or sends',async()=>{assert.equal(await notifyEnquiry(row,{},()=>{throw Error('should not send')}),'not_configured')});
test('permanent errors are reported without repeat sends',async()=>{let calls=0;assert.equal(await notifyEnquiry(row,config,async()=>{calls++;return {ok:false,status:422}}),'failed');assert.equal(calls,1)});
