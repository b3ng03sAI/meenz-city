// Kleiner gzip-Entpacker (Fallback, falls der Browser keinen DecompressionStream hat, z. B. ältere iPhones)
function gunzipSmall(d){let p=10;const fl=d[3];if(fl&4){p+=2+(d[p]|d[p+1]<<8);}if(fl&8){while(d[p++]);}if(fl&16){while(d[p++]);}if(fl&2)p+=2;
  const isz=(d[d.length-4]|d[d.length-3]<<8|d[d.length-2]<<16|d[d.length-1]<<24)>>>0;let out=new Uint8Array(isz||d.length*4),op=0;
  let bb=0,bc=0;const bits=n=>{while(bc<n){bb|=d[p++]<<bc;bc+=8;}const v=bb&((1<<n)-1);bb>>>=n;bc-=n;return v;};
  const ensure=n=>{if(op+n>out.length){const o=new Uint8Array(Math.max(out.length*2,op+n));o.set(out);out=o;}};
  const build=(lens,n)=>{const cnt=new Uint16Array(16),offs=new Uint16Array(16),sym=new Uint16Array(n);for(let i=0;i<n;i++)cnt[lens[i]]++;cnt[0]=0;for(let i=1;i<16;i++)offs[i]=offs[i-1]+cnt[i-1];for(let i=0;i<n;i++)if(lens[i])sym[offs[lens[i]]++]=i;return {cnt,sym};};
  const dec=t=>{let code=0,first=0,idx=0;for(let l=1;l<16;l++){code|=bits(1);const c=t.cnt[l];if(code-first<c)return t.sym[idx+code-first];idx+=c;first+=c;first<<=1;code<<=1;}throw new Error('inflate');};
  const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let fixL=null,fixD=null;let fin=0;
  while(!fin){fin=bits(1);const type=bits(2);
    if(type===0){bb=0;bc=0;const len=d[p]|d[p+1]<<8;p+=4;ensure(len);out.set(d.subarray(p,p+len),op);op+=len;p+=len;continue;}
    let lt,dt;
    if(type===1){if(!fixL){const l=new Uint8Array(288);l.fill(8,0,144);l.fill(9,144,256);l.fill(7,256,280);l.fill(8,280,288);fixL=build(l,288);fixD=build(new Uint8Array(30).fill(5),30);}lt=fixL;dt=fixD;}
    else{const hl=bits(5)+257,hd=bits(5)+1,hc=bits(4)+4;const ord=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const cl=new Uint8Array(19);for(let i=0;i<hc;i++)cl[ord[i]]=bits(3);const ct=build(cl,19);
      const L=new Uint8Array(hl+hd);for(let i=0;i<hl+hd;){const s=dec(ct);if(s<16)L[i++]=s;else if(s===16){const v=L[i-1];let r=3+bits(2);while(r--)L[i++]=v;}else if(s===17){let r=3+bits(3);while(r--)L[i++]=0;}else{let r=11+bits(7);while(r--)L[i++]=0;}}
      lt=build(L.subarray(0,hl),hl);dt=build(L.subarray(hl),hd);}
    for(;;){const s=dec(lt);if(s<256){ensure(1);out[op++]=s;}else if(s===256)break;else{const k=s-257;const len=LB[k]+bits(LE[k]);const ds=dec(dt);const dist=DB[ds]+bits(DE[ds]);ensure(len);for(let i=0;i<len;i++,op++)out[op]=out[op-dist];}}}
  return out.subarray(0,op);}
