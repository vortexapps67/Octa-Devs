import{t as e}from"./rolldown-runtime.Dh6celcD.mjs";import{C as t,P as n,c as r,l as i,o as a,v as o}from"./react.D20wc1Tc.mjs";import{t as s,x as c}from"./motion.DQ9lNKau.mjs";import{D as l,G as u,o as d}from"./framer.DwaKHlMa.mjs";function f({text:e,transition:t,stagger:a,reverse:s,font:l,color:u,textTransform:d,tag:f,padding:p}){let[m,h]=n(!1),g=`rolling-text-inner-${o().replace(/:/g,``)}`,_=f,v=l?.fontSize??`16px`;l?.letterSpacing;let y=l?.lineHeight,b=l?.fontFamily??`Inter`,x=parseInt(v,10)||16,S;if(typeof y==`number`)S=x*y;else if(typeof y==`string`&&y.includes(`em`))S=x*(parseFloat(y)||1.2);else if(typeof y==`string`){let e=parseFloat(y);S=isNaN(e)?y:`${e}px`}else S=x*1.2;let C=typeof S==`number`?`${S}px`:S,w=`-${C}`,T=`
    .${g} {
      --font-size: ${v};
      --text: ${u};
      --line-height-abs: ${C};
      box-sizing: border-box; margin: 0; padding: 0; vertical-align: top;
      display: flex; overflow: hidden; width: max-content;
      font-family: ${b}; font-size: ${v};
      text-transform: ${d}; user-select: none;
      text-shadow: 0 var(--line-height-abs) 0 var(--text);
    }
    .${g} span {
      display: block; -webkit-backface-visibility: hidden; backface-visibility: hidden;
      white-space: pre; flex-shrink: 0;
      font-family: inherit; font-weight: inherit; font-style: inherit;
      font-size: inherit; letter-spacing: inherit;
      line-height: ${y??1.2};
      color: var(--text);
    }
  `,E={display:`flex`,alignItems:`center`,justifyContent:`center`,width:`100%`,height:`100%`,overflow:`hidden`,padding:p,boxSizing:`border-box`},D={initial:{y:`0%`},hover:{y:w}},O=typeof t?.duration==`number`?t.duration:.5,k=a/100;return i(`div`,{style:E,onMouseEnter:()=>h(!0),onMouseLeave:()=>h(!1),children:[r(_,{className:g,children:[...e].map((n,i)=>{let a=s?e.length-1-i:i,o=e.length>0?O/e.length*a*k:0,u={display:`block`,...l};return r(c.span,{variants:D,initial:`initial`,animate:m?`hover`:`initial`,transition:{...t,delay:o},style:u,children:n===` `?`\xA0`:n},i)})}),r(`style`,{children:T})]})}var p=e((()=>{a(),t(),u(),s(),f.displayName=`Rolling Text`,l(f,{text:{type:d.String,title:`Text`,defaultValue:`Rolling Text`},font:{type:d.Font,title:`Font`,controls:`extended`,defaultValue:{fontFamily:`Inter`,fontWeight:`400`,fontSize:`16px`,fontStyle:`normal`,letterSpacing:`0px`,lineHeight:1.2}},color:{type:d.Color,title:`Color`,defaultValue:`#808080`},transition:{type:d.Transition,title:`Transition`,defaultValue:{type:`spring`,duration:.4,bounce:0}},stagger:{title:`Stagger`,type:d.Number,min:0,max:100,step:1,defaultValue:35,unit:`%`},padding:{title:`Padding`,type:d.Padding,defaultValue:`0px`},reverse:{type:d.Boolean,title:`Reverse`,defaultValue:!1,enabledTitle:`Yes`,disabledTitle:`No`},textTransform:{title:`Transform`,type:d.Enum,defaultValue:`none`,options:[`none`,`uppercase`,`lowercase`,`capitalize`],optionTitles:[`None`,`Uppercase`,`Lowercase`,`Capitalize`]},tag:{type:d.Enum,title:`Tag`,options:[`p`,`span`,`h1`,`h2`,`h3`,`h4`,`h5`,`h6`],optionTitles:[`p`,`span`,`h1`,`h2`,`h3`,`h4`,`h5`,`h6`],defaultValue:`p`,description:`More components at [Framer University](https://frameruni.link/cc).`}})}));export{p as n,f as t};
//# sourceMappingURL=RollingTextHover_Prod.bQsvEPFw.mjs.map