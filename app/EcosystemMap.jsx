"use client";

import { useEffect, useRef } from "react";
import register from "../data/register.json";

/* This component's JSX only lays out the static shell (header, toolbar,
   stage containers, panel, gaps, board). Everything inside those containers
   is built imperatively by the effect below — ported close to verbatim from
   the original vanilla-JS map (ecosystem-infrastructure-map.html) rather
   than rewritten as React state/render, since the drawing logic (SVG layout,
   pan/zoom, level-of-detail) has no React-shaped equivalent worth the risk
   of a rewrite. The effect runs once per mount; `ranRef` guards against
   React Strict Mode's double-invoke in dev, which would otherwise duplicate
   every chip/edge/city on the canvas. */
export default function EcosystemMap() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    /* ============================================================
       REGISTER  — every node carries source + confidence.
       confidence: "confirmed" (evidence found) | "inferred" | "unknown"
       ownership : own | experience | shared | contested | consume | unknown
       ============================================================ */

    var OWN = {
      own:       {label:"Own & operate",      c:"var(--own)", desc:"OSS builds it and runs it."},
      experience:{label:"Own the experience", c:"var(--exp)", desc:"We own what ships on it, not the platform."},
      shared:    {label:"Shared operation",   c:"var(--shr)", desc:"Genuine joint run, defined split."},
      contested: {label:"Contested",          c:"var(--con)", desc:"Live ownership discussion, position stated on both sides."},
      consume:   {label:"Consume",            c:"var(--use)", desc:"We integrate, someone else runs it."}
    };

    var LAYERS = [
      {id:"manage",  t:"Manage & Plan",         s:"Work intake, briefs, campaign planning", kind:"stage", col:0},
      {id:"assets",  t:"Assets & Media",        s:"Approved images, documents, video",      kind:"stage", col:1},
      {id:"author",  t:"Author & Assemble",     s:"Where pages and content are built",      kind:"stage", col:2},
      {id:"deliver", t:"Host, Deliver, Integrate", s:"Runtime, edge, APIs",                 kind:"stage", col:3},
      {id:"engage",  t:"Experience & Engagement", s:"The surfaces audiences actually see",  kind:"stage", col:4},
      {id:"measure", t:"Measure",               s:"Analytics feeding back into planning",   kind:"stage", col:5},

      {id:"review",  t:"Review & Approval",     s:"MLR sign-off. A round trip, not a step in the line.", kind:"band"},
      {id:"design",  t:"Design Systems",        s:"Component libraries the experience layer renders from", kind:"band"},
      {id:"identity",t:"Identity & Access",     s:"Who the visitor is, and what they may see", kind:"band"},
      {id:"provision",t:"Provisioning & Governance", s:"How sites, stacks and access get created", kind:"band"},
      {id:"infra",   t:"Infrastructure",        s:"Compute, edge, DNS, source control",     kind:"band"},
      {id:"mcp",     t:"Agentic / MCP Surface", s:"What is reachable by an agent today",    kind:"band"}
    ];

    /* the register itself: data/register.json is the source of truth,
       committed and edited on its own, not hand-typed into this script */
    var C = register.components;
    var E = register.edges;

    /* ============================================================
       LAYOUT — deterministic. Same positions every load.
       ============================================================ */
    var W = 2560;
    var SX = 70, SY = 96, SW = 390, SGAP = 22;
    var BX = 300, BW = 2220, BH = 108, BGAP = 14, GUT = 280;
    var CHH = 64, CGAP = 10, SHEAD = 78;

    var byId = {}, byLayer = {};
    C.forEach(function(c){ byId[c.id] = c; (byLayer[c.l] = byLayer[c.l] || []).push(c); });

    /* stage columns grow to hold the fullest layer, and the bands follow them down,
       so adding components never pushes anything outside its box */
    var maxStage = 0;
    LAYERS.forEach(function(L){
      if(L.kind === "stage") maxStage = Math.max(maxStage, (byLayer[L.id] || []).length);
    });
    var nBands = LAYERS.filter(function(z){ return z.kind === "band"; }).length;
    var SH = SHEAD + maxStage * (CHH + CGAP) - CGAP + 24;
    var BY = SY + SH + 88;
    var H  = BY + nBands * (BH + BGAP) - BGAP + 70;

    LAYERS.forEach(function(L, i){
      if(L.kind === "stage"){
        L.x = SX + L.col * (SW + SGAP); L.y = SY; L.w = SW; L.h = SH;
      } else {
        var bi = LAYERS.filter(function(z){return z.kind==="band"}).indexOf(L);
        L.x = BX; L.y = BY + bi * (BH + BGAP); L.w = BW; L.h = BH;
      }
      var list = byLayer[L.id] || [];
      if(L.kind === "stage"){
        var top = L.y + SHEAD;
        list.forEach(function(c, j){
          c.x = L.x + 18; c.y = top + j * (CHH + CGAP); c.w = L.w - 36; c.h = CHH;
        });
      } else {
        /* label column must clear the longest band title and subtitle */
        var cw = 208, cgx = 12, cx = L.x + 462, cy = L.y + 29, ch2 = 50;
        list.forEach(function(c, j){
          c.x = cx + j * (cw + cgx); c.y = cy; c.w = cw; c.h = ch2;
        });
      }
    });

    /* ============================================================
       RENDER
       ============================================================ */
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.getElementById("svg");
    var defs = el("defs");
    [["ah","#000067"],["ahb","#0000C9"]].forEach(function(m){
      var mk = el("marker",{id:m[0],viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse"});
      mk.appendChild(el("path",{d:"M0 0 L10 5 L0 10 z",fill:m[1]}));
      defs.appendChild(mk);
    });
    svg.appendChild(defs);
    var root = el("g");
    svg.appendChild(root);
    var gFlow = el("g"), gTerr = el("g"), gEdge = el("g"), gChip = el("g");
    [gFlow, gTerr, gEdge, gChip].forEach(function(g){ root.appendChild(g); });

    function el(t, a){ var n = document.createElementNS(NS, t); if(a) for(var k in a) n.setAttribute(k, a[k]); return n; }
    function txt(s, a){ var n = el("text", a); n.textContent = s; return n; }

    /* flow arrow behind the stage row */
    (function(){
      var y = SY + SH + 26, x1 = SX + 40, x2 = SX + 5*(SW+SGAP) + SW - 40;
      gFlow.appendChild(el("path", {d:"M"+x1+" "+y+" L"+x2+" "+y, class:"flow"}));
      var lb = txt("Content flows left to right. Review and measure loop back.", {x:(x1+x2)/2, y:y+6, "text-anchor":"middle", class:"tsub", "font-size":"15"});
      gFlow.appendChild(lb);
    })();

    /* territories */
    LAYERS.forEach(function(L){
      var g = el("g"); g.setAttribute("data-layer", L.id);
      var r = el("rect", {x:L.x, y:L.y, width:L.w, height:L.h, rx:14, class:"terr" + (L.kind==="band" ? " band" : "")});
      r.classList.add("hot");
      r.addEventListener("click", function(ev){ ev.stopPropagation(); flyTo(L); });
      g.appendChild(r);
      var ty = L.kind === "band" ? L.y + 44 : L.y + 34;
      g.appendChild(txt(L.t, {x:L.x+20, y:ty, class:"tname", "font-size":"20"}));
      g.appendChild(txt(L.s, {x:L.x+20, y:ty+22, class:"tsub", "font-size":"13"}));
      if(L.kind === "band"){
        g.appendChild(el("line", {x1:L.x+440, y1:L.y+16, x2:L.x+440, y2:L.y+L.h-16,
          stroke:"var(--ice)", "stroke-width":"1.5", class:"lod-mid"}));
      }

      var list = byLayer[L.id] || [];
      /* far-zoom summary */
      var sg = el("g", {class:"lod-far"});
      var order = ["own","experience","shared","contested","consume"];
      var bx, byy, bw, bh, ox, oy, oanch;
      if(L.kind === "stage"){
        var cx = L.x + L.w/2, cy = L.y + L.h/2;
        sg.appendChild(txt(String(list.length), {x:cx, y:cy, "text-anchor":"middle", class:"tbig"}));
        sg.appendChild(txt(list.length===1?"component":"components", {x:cx, y:cy+28, "text-anchor":"middle", class:"tbiglbl"}));
        bw = 230; bx = cx - bw/2; byy = cy + 52; bh = 10;
        ox = cx; oy = byy + bh + 18; oanch = "middle";
      } else {
        /* counts live in the gutter to the LEFT of the band, never over the components */
        var gr = L.x - 20;
        sg.appendChild(txt(String(list.length), {x:gr, y:L.y+46, "text-anchor":"end", class:"tbig", "font-size":"36"}));
        sg.appendChild(txt(list.length===1?"component":"components", {x:gr, y:L.y+66, "text-anchor":"end", class:"tbiglbl", "font-size":"12.5"}));
        bw = 180; bx = gr - bw; byy = L.y + 78; bh = 10;
        ox = gr; oy = L.y + 102; oanch = "end";
      }
      var seg = list.length ? bw/list.length : 0, k = 0;
      order.forEach(function(o){
        list.filter(function(c){ return c.o===o; }).forEach(function(){
          sg.appendChild(el("rect", {x:bx + k*seg, y:byy, width:Math.max(seg-2.5,2), height:bh, rx:2, fill:OWN[o].c}));
          k++;
        });
      });
      if(list.length){
        var owned = list.filter(function(c){ return c.o==="own"; }).length;
        sg.appendChild(txt(owned ? owned+" owned & operated" : "nothing owned here",
          {x:ox, y:oy, "text-anchor":oanch, class:"tbiglbl", "font-size":"12.5",
           fill: owned ? "var(--mgray)" : "var(--lav)"}));
      } else {
        sg.appendChild(el("rect",{x:L.x+18,y:L.y+70,width:L.w-36,height:L.h-90,rx:10,class:"empty"}));
        sg.appendChild(txt("No components", {x:L.x+L.w/2, y:L.y+L.h/2, "text-anchor":"middle", class:"emptxt"}));
      }
      g.appendChild(sg);
      gTerr.appendChild(g);
    });

    /* edges */
    /* stop the line at the box edge, not the centre, so the arrowhead is visible */
    function anchor(c, tx2, ty2){
      var cx = c.x + c.w/2, cy = c.y + c.h/2, dx = tx2 - cx, dy = ty2 - cy;
      if(!dx && !dy) return [cx, cy];
      var sx = dx ? (c.w/2 + 7)/Math.abs(dx) : Infinity;
      var sy = dy ? (c.h/2 + 7)/Math.abs(dy) : Infinity;
      var s = Math.min(sx, sy);
      return [cx + dx*s, cy + dy*s];
    }
    var edgeEls = [], pairSeen = {};
    E.forEach(function(e){
      var a = byId[e.a], b = byId[e.b];
      if(!a || !b) return;
      var g = el("g", {class:"eg"});
      var ac = [a.x+a.w/2, a.y+a.h/2], bc = [b.x+b.w/2, b.y+b.h/2];
      var p1 = anchor(a, bc[0], bc[1]), p2 = anchor(b, ac[0], ac[1]);
      var dx = p2[0]-p1[0], dy = p2[1]-p1[1], len = Math.sqrt(dx*dx + dy*dy) || 1;
      /* fan out lines that share a target so they stay distinguishable */
      var key = [e.a, e.b].sort().join("|");
      pairSeen[e.b] = (pairSeen[e.b] || 0) + 1;
      var bow = Math.min(70, len*0.13) + (pairSeen[e.b] % 3) * 10;
      var mx = (p1[0]+p2[0])/2 - (dy/len)*bow, my = (p1[1]+p2[1])/2 + (dx/len)*bow;
      var p = el("path", {d:"M"+p1[0]+" "+p1[1]+" Q"+mx+" "+my+" "+p2[0]+" "+p2[1],
        class:"edge"+(e.cf==="inferred" ? " inf" : "")});
      g.appendChild(p);
      var lx = (p1[0] + 2*mx + p2[0])/4, ly = (p1[1] + 2*my + p2[1])/4;
      g.appendChild(txt(e.t, {x:lx, y:ly-5, "text-anchor":"middle", class:"elbl"}));
      gEdge.appendChild(g);
      edgeEls.push({e:e, g:g, path:p});
    });

    /* chips */
    var chipEls = {};
    C.forEach(function(c){
      var g = el("g", {class:"chip cf-"+c.cf+" lod-mid"});
      g.setAttribute("data-id", c.id);
      g.appendChild(el("rect", {x:c.x, y:c.y, width:c.w, height:c.h, rx:9, class:"bg"}));
      g.appendChild(el("rect", {x:c.x, y:c.y, width:5, height:c.h, rx:2.5, fill:OWN[c.o].c, class:"ob"}));
      g.appendChild(txt(c.n, {x:c.x+16, y:c.y+22, class:"n"}));
      var sub = el("text", {x:c.x+16, y:c.y+38, class:"d lod-near"});
      sub.textContent = clip(c.d, c.w > 300 ? 46 : 30);
      g.appendChild(sub);
      var own = el("text", {x:c.x+16, y:c.y+54, class:"d lod-near", fill:OWN[c.o].c, "font-weight":"700"});
      own.textContent = OWN[c.o].label + (c.cf==="unknown" ? "  ·  unverified" : "");
      if(c.h > 50) g.appendChild(own);
      g.addEventListener("click", function(ev){ ev.stopPropagation(); select(c.id); });
      gChip.appendChild(g);
      chipEls[c.id] = g;
    });
    function clip(s, n){ return s.length > n ? s.slice(0, n-1).trim() + "…" : s; }

    /* ============================================================
       ZOOM / PAN
       ============================================================ */
    var z = 0.45, tx = 0, ty = 0, FAR = 0.451, NEAR = 1.2, FITMAX = 0.45;
    function apply(){
      root.setAttribute("transform", "translate("+tx+","+ty+") scale("+z+")");
      var lod = z < FAR ? "far" : (z < NEAR ? "mid" : "near");
      svg.setAttribute("data-lod", lod);
      document.getElementById("lvl").textContent =
        (lod==="far" ? "Whole estate" : lod==="mid" ? "Components" : "Detail & integrations") + "  ·  " + Math.round(z*100) + "%";
    }
    function vp(){ var r = svg.getBoundingClientRect(); return {w:r.width, h:r.height}; }
    function fit(){
      var v = vp();
      z = Math.min(FITMAX, v.w/(W+80), v.h/(H+60));
      tx = (v.w - W*z)/2; ty = (v.h - H*z)/2; apply();
    }
    function zoomAt(f, px, py){
      var nz = Math.max(0.18, Math.min(3.2, z*f));
      tx = px - (px - tx) * (nz/z); ty = py - (py - ty) * (nz/z); z = nz; apply();
    }
    /* legend clicks isolate components, but at whole-estate zoom nothing has
       resolved into a component yet, so jump straight past that threshold */
    function ensureComponentsVisible(){
      if(curView !== "map") return;
      var target = FAR + 0.1;
      if(z < target){ var v = vp(); zoomAt(target/z, v.w/2, v.h/2); }
    }
    function flyTo(L){
      var v = vp(), pad = 70;
      var nz = Math.min(2.2, Math.min(v.w/(L.w+pad*2), v.h/(L.h+pad*2)));
      nz = Math.max(nz, NEAR + 0.05);
      var sx = tx, sy = ty, sz = z;
      var ez = nz, ex = v.w/2 - (L.x + L.w/2)*nz, ey = v.h/2 - (L.y + L.h/2)*nz;
      var t0 = performance.now(), D = 420;
      (function step(t){
        var k = Math.min(1, (t-t0)/D), e = k<0.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
        z = sz+(ez-sz)*e; tx = sx+(ex-sx)*e; ty = sy+(ey-sy)*e; apply();
        if(k < 1) requestAnimationFrame(step);
      })(t0);
    }
    svg.addEventListener("wheel", function(ev){
      ev.preventDefault();
      var r = svg.getBoundingClientRect();
      zoomAt(ev.deltaY < 0 ? 1.13 : 1/1.13, ev.clientX - r.left, ev.clientY - r.top);
    }, {passive:false});
    var dragging = false, lx = 0, ly = 0, moved = 0;
    svg.addEventListener("pointerdown", function(ev){
      dragging = true; moved = 0; lx = ev.clientX; ly = ev.clientY;
      svg.classList.add("drag"); svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener("pointermove", function(ev){
      if(!dragging) return;
      var dx = ev.clientX - lx, dy = ev.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy);
      tx += dx; ty += dy; lx = ev.clientX; ly = ev.clientY; apply();
    });
    function endDrag(){ dragging = false; svg.classList.remove("drag"); }
    svg.addEventListener("pointerup", function(ev){
      endDrag();
      if(moved < 4 && ev.target === svg) deselect();
    });
    svg.addEventListener("pointercancel", endDrag);
    function zoomActive(f){
      if(curView === "globe"){ var w = vp2(); zoomAt2(f, w.w/2, w.h/2); }
      else { var v = vp(); zoomAt(f, v.w/2, v.h/2); }
    }
    document.getElementById("zin").onclick  = function(){ zoomActive(1.35); };
    document.getElementById("zout").onclick = function(){ zoomActive(1/1.35); };
    document.getElementById("zfit").onclick = function(){
      deselect();
      resetFilter();
      gapsEl.classList.remove("open");
      if(curView === "globe"){
        fit2();
        var ob = document.getElementById("gorph");
        ob.setAttribute("aria-pressed","false"); svg2.classList.remove("orph");
      } else fit();
    };

    /* ============================================================
       SELECTION PANEL
       ============================================================ */
    var panel = document.getElementById("panel"), selId = null, curView = "map";

    /* Both the legend and clicking a component work the same way now:
       pick one or more things to isolate, everything else goes quiet.
       Arrows are Atlas-only now, so this only matters visually there;
       the Map view just isolates chips. refreshVisuals is the single
       place that applies whichever is active. */
    function refreshVisuals(){
      var byState = isolate.size > 0;
      C.forEach(function(c){
        var hideByState = byState && !isolate.has(c.o);
        var hideBySel   = !!selId && c.id !== selId;
        var hide = selId ? hideBySel : hideByState;
        chipEls[c.id].classList.toggle("dim", hide);
        chipEls[c.id].classList.toggle("sel", c.id === selId);
        if(typeof cityEls !== "undefined"){
          cityEls[c.id].classList.toggle("dim", hide);
          cityEls[c.id].classList.toggle("sel", c.id === selId);
        }
      });
      edgeEls.forEach(function(x){
        var aIn = !byState || isolate.has(byId[x.e.a].o), bIn = !byState || isolate.has(byId[x.e.b].o);
        var hit = !!selId && (x.e.a===selId || x.e.b===selId);
        x.g.classList.toggle("off", selId ? !hit : !(aIn && bIn));
        x.g.classList.toggle("on", hit);
      });
      svg.classList.toggle("focus", !!selId);
      if(typeof roadEls !== "undefined"){
        roadEls.forEach(function(x){
          var aIn = !byState || isolate.has(byId[x.e.a].o), bIn = !byState || isolate.has(byId[x.e.b].o);
          var hit = !!selId && (x.e.a===selId || x.e.b===selId);
          x.g.classList.toggle("off", selId ? !hit : !(aIn && bIn));
          x.g.classList.toggle("on", hit);
        });
        svg2.classList.toggle("focus", !!selId);
      }
    }
    function deselect(){
      selId = null; panel.classList.remove("open");
      refreshVisuals();
    }
    function select(id){
      var c = byId[id]; if(!c) return;
      selId = id;
      refreshVisuals();
      var links = [];
      edgeEls.forEach(function(x){
        var hit = x.e.a===id || x.e.b===id;
        if(hit){
          var other = x.e.a===id ? x.e.b : x.e.a;
          links.push({dir: x.e.a===id ? "out" : "in", t:x.e.t, o:other, cf:x.e.cf, why:x.e.why});
        }
      });
      var L = LAYERS.filter(function(z){return z.id===c.l})[0];
      var h = "";
      h += '<div class="ph"><h3>'+esc(c.n)+'</h3><button class="close" aria-label="Close">&times;</button></div><div class="pb">';
      h += '<p>'+esc(c.d)+'</p>';
      h += '<dl class="kv">';
      h += '<dt>Layer</dt><dd>'+esc(L ? L.t : c.l)+'</dd>';
      h += '<dt>Ownership</dt><dd><span class="pill"><span class="dot" style="background:'+OWN[c.o].c+'"></span>'+OWN[c.o].label+'</span></dd>';
      h += '<dt>Operated by</dt><dd>'+esc(c.op)+'</dd>';
      h += '<dt>Confidence</dt><dd>'+({confirmed:"Confirmed against a source",inferred:"Inferred, needs confirming",unknown:"Unverified"})[c.cf]+'</dd>';
      if(c.st) h += '<dt>Status</dt><dd>'+esc(c.st)+'</dd>';
      h += '</dl>';
      h += '<p style="font-size:13px;color:var(--mgray)">'+OWN[c.o].desc+'</p>';
      if(c.note) h += '<h4>Reasoning to align on</h4><p>'+esc(c.note)+'</p>';
      h += '<h4>Integrations ('+links.length+')</h4>';
      if(links.length){
        h += '<ul class="lnk">' + links.map(function(k){
          var o = byId[k.o];
          return '<li data-go="'+k.o+'"><b>'+(k.dir==="out"?"":"← ")+esc(k.t)+' '+esc(o?o.n:k.o)+'</b><em>'+(k.cf==="confirmed"?"Confirmed":"Inferred")+'. '+esc(k.why)+'</em></li>';
        }).join('') + '</ul>';
      } else {
        h += '<div class="none">No integrations recorded. Either this component is genuinely isolated, or its dependencies are not represented anywhere in the vault. Both are findings.</div>';
      }
      h += '<div class="src"><strong>Source:</strong> '+esc(c.src)+'</div>';
      h += '</div>';
      panel.innerHTML = h;
      panel.classList.add("open");
      panel.querySelector(".close").onclick = deselect;
      Array.prototype.forEach.call(panel.querySelectorAll("[data-go]"), function(li){
        li.onclick = function(){ select(li.getAttribute("data-go")); };
      });
    }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]; }); }

    /* ============================================================
       OWNERSHIP FILTER — clicking a state isolates it: only components
       in that state (and their arrows) stay visible. Click a second
       state and both stay visible together; the rest stays quiet.
       ============================================================ */
    var isolate = new Set();
    var lgd = document.getElementById("lgd");
    var legendBtn = {};
    function applyFilter(){ refreshVisuals(); }
    function resetFilter(){
      isolate.clear();
      Object.keys(legendBtn).forEach(function(k){
        legendBtn[k].wrap.classList.remove("iso", "excluded");
        legendBtn[k].btn.setAttribute("aria-pressed", "false");
      });
      refreshVisuals();
    }
    Object.keys(OWN).forEach(function(k){
      var wrap = document.createElement("span");
      wrap.className = "ti";
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-pressed","false");
      b.setAttribute("aria-describedby", "tt-"+k);
      b.innerHTML = '<span class="dot" style="background:'+OWN[k].c+'"></span>'+OWN[k].label;
      b.onclick = function(){
        if(isolate.has(k)) isolate.delete(k); else isolate.add(k);
        Object.keys(legendBtn).forEach(function(j){
          var iso = isolate.has(j);
          legendBtn[j].wrap.classList.toggle("iso", iso);
          legendBtn[j].wrap.classList.toggle("excluded", isolate.size>0 && !iso);
          legendBtn[j].btn.setAttribute("aria-pressed", iso ? "true" : "false");
        });
        deselect();
        refreshVisuals();
        if(isolate.size > 0){ ensureComponentsVisible(); ensureCitiesVisible(); }
      };
      var tt = document.createElement("span");
      tt.className = "tt"; tt.id = "tt-"+k; tt.setAttribute("role","tooltip");
      tt.innerHTML = '<b>'+OWN[k].label+'</b>'+OWN[k].desc;
      wrap.appendChild(b); wrap.appendChild(tt);
      lgd.appendChild(wrap);
      legendBtn[k] = { wrap: wrap, btn: b };
    });

    /* ============================================================
       GAPS — derived from the register, not written by hand
       ============================================================ */
    function buildGaps(){
      var out = [];
      var deg = {}; C.forEach(function(c){ deg[c.id]=0; });
      E.forEach(function(e){ if(deg[e.a]!==undefined) deg[e.a]++; if(deg[e.b]!==undefined) deg[e.b]++; });

      /* 1. no owned capability in a layer */
      LAYERS.forEach(function(L){
        var list = byLayer[L.id] || [];
        if(!list.length) return;
        if(!list.some(function(c){ return c.o==="own"; })){
          out.push({k:"cap", tag:"Capability gap", h:"No owned capability in "+L.t,
            p:"Every component in this layer is consumed, shared or contested. Nothing here is built and run by OSS, so we have no lever of our own at this stage of the lifecycle.",
            li:list.map(function(c){ return c.n+" ("+OWN[c.o].label.toLowerCase()+")"; })});
        }
      });

      /* 2. overlap */
      [{l:"author", n:"authoring routes"},{l:"assets", n:"asset stores"},{l:"design", n:"design systems"},{l:"deliver", n:"hosting targets"}].forEach(function(s){
        var list = byLayer[s.l] || [];
        if(list.length >= 3){
          out.push({k:"ovl", tag:s.l==="deliver" ? "Migration in progress" : "Overlap",
            h:list.length+(s.l==="deliver" ? " recorded " : " competing ")+s.n,
            p:s.l==="deliver"
              ? "The hosting estate is in transition, with many sites and applications switching to Spark Pro. Multiple hosting targets reflect this work in progress, not necessarily unmanaged duplication. The register will be updated as migration details are confirmed."
              : "Multiple components answer the same question in this layer with no visible decision rule for which to use when. That is unmanaged duplication until someone writes the rule down.",
            li:list.map(function(c){ return c.n; })});
        }
      });

      /* 3. integration mapping follow-up */
      var orph = C.filter(function(c){ return deg[c.id]===0; });
      if(orph.length){
        out.push({k:"orp", tag:"Dependency mapping", h:orph.length+" components with no integrations recorded yet",
          p:"This is the current state of the register, not evidence that these components are isolated. Conversations with the relevant people are still needed to fill in their integration details. Confirmed non-integrations are noted separately in component details.",
          li:orph.map(function(c){ return c.n; })});
      }

      /* 4. contested */
      var cont = C.filter(function(c){ return c.o==="contested"; });
      if(cont.length){
        out.push({k:"own", tag:"Ownership", h:cont.length+" components are contested",
          p:"Operational ownership of both is in transition, so the question is being forced whether or not anyone chooses to open it. OSS&AI's position is that these are orchestration and enablement layers. Note that the cited Web Publishing Options source argues that layers are separately sourceable and replaceable, which supports separability rather than combined governance. The stronger case is that the seams between layers need an owner, not the layers themselves.",
          li:cont.map(function(c){ return c.n+" — currently "+c.op; })});
      }

      /* 5. recorded connection counts */
      var top = C.slice().sort(function(a,b){ return deg[b.id]-deg[a.id]; })[0];
      if(top && deg[top.id] >= 3){
        out.push({k:"orp", tag:"Current connections", h:top.n+" has the most recorded connections",
          p:"It has "+deg[top.id]+" integrations in the current register. This count includes incoming and outgoing links, and is not a measure of criticality or a complete picture of the estate. Many sites and applications are switching to Spark Pro; migration is in progress and the recorded connections will change as the map is filled in.",
          li:E.filter(function(e){ return e.a===top.id||e.b===top.id; }).map(function(e){
            var o = e.a===top.id ? e.b : e.a; return (byId[o]||{}).n + " " + e.t; })});
      }
      return out;
    }
    var gapsEl = document.getElementById("gaps");
    function renderGaps(){
      var g = buildGaps();
      var confirmed = C.filter(function(c){return c.cf==="confirmed"}).length;
      var h = '<div class="gh"><h3>Gaps identified</h3><span style="font-size:12.5px;opacity:.8">Current register snapshot. Mapping follow-ups are not necessarily estate gaps.</span><button class="close" aria-label="Close">&times;</button></div><div class="gb">';
      h += g.map(function(x){
        return '<div class="gcard"><span class="tag t-'+x.k+'">'+x.tag+'</span><h4>'+esc(x.h)+'</h4><p>'+esc(x.p)+'</p>'+
          (x.li && x.li.length ? '<ul>'+x.li.slice(0,9).map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+
          (x.li.length>9?'<li>and '+(x.li.length-9)+' more</li>':'')+'</ul>' : '')+'</div>';
      }).join('');
      h += '<p class="gnote">Register completeness: '+confirmed+' of '+C.length+' components confirmed against a source, '+
           E.filter(function(e){return e.cf==="confirmed"}).length+' of '+E.length+' integrations confirmed. '+
           'This is a first draft built from Luca’s spec, the Content Platform Architecture, the MCP Application Register and Confluence, with clarifications from Christos and Dilawar. Treat every dashed line and every inferred integration as a question, not a fact.</p>';
      h += '</div>';
      gapsEl.innerHTML = h;
      gapsEl.querySelector(".close").onclick = function(){ gapsEl.classList.remove("open"); };
    }
    document.getElementById("gapsBtn").onclick = function(){
      if(!gapsEl.innerHTML) renderGaps();
      gapsEl.classList.toggle("open");
    };

    /* ============================================================
       ESTATE BOARD
       ============================================================ */
    function renderBoard(){
      /* Consume is no longer a column. It sits underneath as the foundation
         everything above rests on, which is how Luca reads it. */
      var cols = ["own","experience","shared","contested"];
      var h = '<table class="btbl"><thead><tr><th class="rh"></th>';
      cols.forEach(function(o){
        h += '<th><div class="bhd"><span class="dot" style="background:'+OWN[o].c+'"></span>'+OWN[o].label+'</div></th>';
      });
      h += '</tr></thead><tbody>';
      LAYERS.forEach(function(L){
        var list = byLayer[L.id] || [];
        if(!list.filter(function(c){ return c.o !== "consume"; }).length) return;
        h += '<tr><th class="row">'+esc(L.t)+'</th>';
        cols.forEach(function(o){
          var cells = list.filter(function(c){ return c.o===o; });
          h += '<td'+(cells.length?'':' class="z"')+'>' + cells.map(function(c){
            return '<button class="bc '+c.cf+'" data-id="'+c.id+'">'+esc(c.n)+'</button>';
          }).join('') + '</td>';
        });
        h += '</tr>';
      });
      h += '</tbody></table>';

      /* the foundation band */
      var cons = C.filter(function(c){ return c.o==="consume"; });
      h += '<div class="found"><div class="fhd"><span class="dot" style="background:'+OWN.consume.c+'"></span>'+
           '<strong>Foundation: consumed services</strong>'+
           '<span>'+cons.length+' components everything above runs on. Mostly infrastructure and hosting from Digital, plus third-party platforms.</span></div>';
      h += '<div class="frow">';
      LAYERS.forEach(function(L){
        var cells = (byLayer[L.id]||[]).filter(function(c){ return c.o==="consume"; });
        if(!cells.length) return;
        h += '<div class="fgrp"><h5>'+esc(L.t)+'</h5>'+cells.map(function(c){
          return '<button class="bc '+c.cf+'" data-id="'+c.id+'">'+esc(c.n)+'</button>';
        }).join('')+'</div>';
      });
      h += '</div></div>';

      h += '<p style="font-size:13px;color:var(--mgray);margin-top:18px;max-width:920px">'+
        'Hatched cells are empty on purpose: they show where the estate has nothing in that state. Dashed borders are inferred. '+
        'The leftmost column is what OSS builds and runs. Layers with nothing above the foundation are hidden from the grid and appear only below.</p>';
      boardEl.innerHTML = h;
      Array.prototype.forEach.call(boardEl.querySelectorAll(".bc"), function(b){
        b.onclick = function(){ setView("map"); select(b.getAttribute("data-id")); var c=byId[b.getAttribute("data-id")]; var L=LAYERS.filter(function(z){return z.id===c.l})[0]; if(L) flyTo(L); };
      });
    }

    /* ============================================================
       ATLAS — the same register drawn as a world. Continents are
       layers, cities are components sized by how much depends on
       them, roads are integrations. A city with no roads is an
       orphan, which is exactly what this view is good at showing.
       ============================================================ */
    var svg2 = document.getElementById("svg2");
    var root2 = el("g"); svg2.appendChild(root2);
    var gSea = el("g"), gRoad = el("g"), gCity = el("g");
    [gSea, gRoad, gCity].forEach(function(g){ root2.appendChild(g); });

    var GW = 2800, GH = 1420;
    var DEG = {}; C.forEach(function(c){ DEG[c.id] = 0; });
    E.forEach(function(e){ if(DEG[e.a]!==undefined) DEG[e.a]++; if(DEG[e.b]!==undefined) DEG[e.b]++; });

    /* ---- molecular scaffolding ----------------------------------------- */
    var NSNS = "http://www.w3.org/2000/svg";
    (function defsAtlas(){
      var defs = el("defs");
      /* deep-space wash behind everything */
      var bg = document.createElementNS(NSNS, "radialGradient");
      bg.setAttribute("id","bgGrad"); bg.setAttribute("cx","50%"); bg.setAttribute("cy","42%"); bg.setAttribute("r","78%");
      [["0%","#12224A"],["55%","#0A0F2C"],["100%","#05061C"]].forEach(function(s){
        var st = document.createElementNS(NSNS,"stop");
        st.setAttribute("offset",s[0]); st.setAttribute("stop-color",s[1]); bg.appendChild(st);
      });
      defs.appendChild(bg);
      /* nucleus glow, reused by every cluster */
      var ng = document.createElementNS(NSNS,"radialGradient");
      ng.setAttribute("id","nucGrad");
      [["0%","#2E6FB7","0.55"],["45%","#1B3E77","0.28"],["100%","#0A0F2C","0"]].forEach(function(s){
        var st = document.createElementNS(NSNS,"stop");
        st.setAttribute("offset",s[0]); st.setAttribute("stop-color",s[1]); st.setAttribute("stop-opacity",s[2]); ng.appendChild(st);
      });
      defs.appendChild(ng);
      /* soft bloom for bonds */
      var f = document.createElementNS(NSNS,"filter");
      f.setAttribute("id","bloom"); f.setAttribute("x","-25%"); f.setAttribute("y","-25%");
      f.setAttribute("width","150%"); f.setAttribute("height","150%");
      var blur = document.createElementNS(NSNS,"feGaussianBlur");
      blur.setAttribute("stdDeviation","3"); blur.setAttribute("result","b");
      var merge = document.createElementNS(NSNS,"feMerge");
      ["b","SourceGraphic"].forEach(function(n){
        var mn = document.createElementNS(NSNS,"feMergeNode"); mn.setAttribute("in",n); merge.appendChild(mn);
      });
      f.appendChild(blur); f.appendChild(merge); defs.appendChild(f);
      svg2.appendChild(defs);
      var sky = el("rect", {x:-4000, y:-4000, width:12000, height:12000, fill:"url(#bgGrad)"});
      gSea.appendChild(sky);
    })();

    (function placeWorld(){
      var st = LAYERS.filter(function(L){ return L.kind==="stage"; });
      var bd = LAYERS.filter(function(L){ return L.kind==="band"; });
      st.forEach(function(L,i){ var n=(byLayer[L.id]||[]).length;
        L.gx = 330 + i*440; L.gy = 440 + Math.sin(i*1.05)*58; L.gr = 96 + n*16; });
      bd.forEach(function(L,i){ var n=(byLayer[L.id]||[]).length;
        L.gx = 330 + i*440; L.gy = 1105 + Math.cos(i*0.85)*46; L.gr = 82 + n*14; });
      LAYERS.forEach(function(L, li){
        var list = byLayer[L.id] || [];
        list.forEach(function(c, j){
          if(list.length === 1){ c.gx = L.gx; c.gy = L.gy; return; }
          /* ring the atoms on an electron shell rather than scattering them */
          var a = (j/list.length)*Math.PI*2 + li*0.7;
          var rr = L.gr*(list.length>4 ? 0.64 : 0.52);
          if(list.length > 6 && j % 2) rr *= 0.62;
          c.gx = L.gx + Math.cos(a)*rr; c.gy = L.gy + Math.sin(a)*rr;
        });
      });
    })();

    LAYERS.forEach(function(L, i){
      var list = byLayer[L.id] || [], g = el("g");
      g.appendChild(el("circle", {cx:L.gx, cy:L.gy, r:L.gr*1.25, fill:"url(#nucGrad)", "pointer-events":"none"}));
      g.appendChild(el("circle", {cx:L.gx, cy:L.gy, r:L.gr*0.72, class:"shell2"}));
      var shell = el("circle", {cx:L.gx, cy:L.gy, r:L.gr, class:"shell"});
      shell.addEventListener("click", function(ev){ ev.stopPropagation(); flyTo2(L); });
      g.appendChild(shell);
      var lab = el("g", {class:"g-far"});
      lab.appendChild(txt(L.t, {x:L.gx, y:L.gy-4, class:"cname", "font-size":"26"}));
      lab.appendChild(txt(list.length+(list.length===1?" COMPONENT":" COMPONENTS"), {x:L.gx, y:L.gy+22, class:"ccount", "font-size":"14"}));
      var owned = list.filter(function(c){ return c.o==="own"; }).length;
      lab.appendChild(txt(owned ? owned+" OWNED" : "NOTHING OWNED", {x:L.gx, y:L.gy+42, class:"ccount", "font-size":"13",
        fill: owned ? "#7E9CC4" : "#A68AFF"}));
      g.appendChild(lab);
      g.appendChild(txt(L.t, {x:L.gx, y:L.gy-L.gr-16, class:"cname g-mid", "font-size":"19"}));
      gSea.appendChild(g);
    });

    /* bonds: an outer stroke with a bright filament through it */
    var roadEls = [];
    gRoad.setAttribute("filter", "url(#bloom)");
    E.forEach(function(e){
      var a = byId[e.a], b = byId[e.b]; if(!a||!b) return;
      var g = el("g", {class:"rg"});
      var dx=b.gx-a.gx, dy=b.gy-a.gy, len=Math.sqrt(dx*dx+dy*dy)||1, bow=Math.min(120, len*0.16);
      var mx=(a.gx+b.gx)/2-(dy/len)*bow, my=(a.gy+b.gy)/2+(dx/len)*bow;
      var d = "M"+a.gx+" "+a.gy+" Q"+mx+" "+my+" "+b.gx+" "+b.gy;
      g.appendChild(el("path", {d:d, class:"road"+(e.cf==="inferred"?" inf":"")+(a.l!==b.l?" far":"")}));
      if(e.cf !== "inferred") g.appendChild(el("path", {d:d, class:"bondcore"}));
      g.appendChild(txt(e.t, {x:(a.gx+2*mx+b.gx)/4, y:(a.gy+2*my+b.gy)/4-6, class:"rlbl g-near"}));
      gRoad.appendChild(g);
      roadEls.push({e:e, g:g});
    });

    /* atoms: halo, body, specular highlight */
    var cityEls = {};
    C.forEach(function(c){
      var orph = DEG[c.id]===0, r = 6 + Math.min(DEG[c.id],10)*1.7;
      var g = el("g", {class:"city g-mid"+(orph?" isorph":"")});
      g.appendChild(el("circle", {cx:c.gx, cy:c.gy, r:r*2.5, class:"halo", fill:OWN[c.o].c}));
      if(orph) g.appendChild(el("circle", {cx:c.gx, cy:c.gy, r:r+7, class:"oring"}));
      g.appendChild(el("circle", {cx:c.gx, cy:c.gy, r:r, class:"pin", fill:OWN[c.o].c}));
      g.appendChild(el("circle", {cx:c.gx-r*0.33, cy:c.gy-r*0.36, r:Math.max(1.4, r*0.26), class:"spec"}));
      g.appendChild(txt(c.n, {x:c.gx, y:c.gy+r+16, class:"g-near"}));
      g.addEventListener("click", function(ev){ ev.stopPropagation(); select(c.id); });
      gCity.appendChild(g);
      cityEls[c.id] = g;
    });

    var z2 = 0.4, tx2 = 0, ty2 = 0, fitZ2 = 0.4;
    function vp2(){ var r = svg2.getBoundingClientRect(); return {w:r.width, h:r.height}; }
    function apply2(){
      root2.setAttribute("transform", "translate("+tx2+","+ty2+") scale("+z2+")");
      var lod = z2 <= fitZ2*1.03 ? "far" : (z2 < fitZ2*2.3 ? "mid" : "near");
      svg2.setAttribute("data-lod", lod);
      document.getElementById("lvl").textContent =
        (lod==="far" ? "Continents" : lod==="mid" ? "Cities" : "Cities & roads")+"  ·  "+Math.round(z2*100)+"%";
    }
    function fit2(){
      var v = vp2(); if(!v.w) return;
      fitZ2 = z2 = Math.min(v.w/(GW+120), v.h/(GH+90));
      tx2 = (v.w-GW*z2)/2; ty2 = (v.h-GH*z2)/2; apply2();
    }
    function zoomAt2(f, px, py){
      var nz = Math.max(0.12, Math.min(3.2, z2*f));
      tx2 = px-(px-tx2)*(nz/z2); ty2 = py-(py-ty2)*(nz/z2); z2 = nz; apply2();
    }
    /* same idea in the atlas: don't leave cities hidden behind the continent view */
    function ensureCitiesVisible(){
      if(curView !== "globe") return;
      var target = fitZ2 * 1.6;
      if(z2 < target){ var v = vp2(); zoomAt2(target/z2, v.w/2, v.h/2); }
    }
    function flyTo2(L){
      var v = vp2(), nz = Math.max(fitZ2*2.5, Math.min(2.2, Math.min(v.w,v.h)/(L.gr*2.7)));
      var sx=tx2, sy=ty2, sz=z2, ex=v.w/2-L.gx*nz, ey=v.h/2-L.gy*nz, t0=performance.now();
      (function step(t){
        var k=Math.min(1,(t-t0)/430), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        z2=sz+(nz-sz)*e; tx2=sx+(ex-sx)*e; ty2=sy+(ey-sy)*e; apply2();
        if(k<1) requestAnimationFrame(step);
      })(t0);
    }
    svg2.addEventListener("wheel", function(ev){
      ev.preventDefault(); var r=svg2.getBoundingClientRect();
      zoomAt2(ev.deltaY<0?1.13:1/1.13, ev.clientX-r.left, ev.clientY-r.top);
    }, {passive:false});
    var dg2=false, lx2=0, ly2=0, mv2=0;
    svg2.addEventListener("pointerdown", function(ev){ dg2=true; mv2=0; lx2=ev.clientX; ly2=ev.clientY; svg2.classList.add("drag"); svg2.setPointerCapture(ev.pointerId); });
    svg2.addEventListener("pointermove", function(ev){
      if(!dg2) return; var dx=ev.clientX-lx2, dy=ev.clientY-ly2;
      mv2+=Math.abs(dx)+Math.abs(dy); tx2+=dx; ty2+=dy; lx2=ev.clientX; ly2=ev.clientY; apply2();
    });
    svg2.addEventListener("pointerup", function(ev){ dg2=false; svg2.classList.remove("drag"); if(mv2<4 && ev.target===svg2) deselect(); });
    svg2.addEventListener("pointercancel", function(){ dg2=false; svg2.classList.remove("drag"); });

    var orphBtn = document.getElementById("gorph");
    orphBtn.onclick = function(){
      var on = orphBtn.getAttribute("aria-pressed") !== "true";
      orphBtn.setAttribute("aria-pressed", on ? "true" : "false");
      svg2.classList.toggle("orph", on);
    };

    /* ---------- view switching ---------- */
    var boardEl = document.getElementById("board");
    var stageEl = document.getElementById("stage"), stage2El = document.getElementById("stage2");
    function setView(v){
      curView = v;
      Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function(b){
        b.setAttribute("aria-pressed", b.getAttribute("data-view")===v ? "true" : "false");
      });
      document.body.classList.toggle("boardview", v==="board");
      document.body.classList.toggle("globeview", v==="globe");
      stageEl.hidden = (v!=="map");
      stage2El.hidden = (v!=="globe");
      boardEl.classList.toggle("on", v==="board");
      if(v==="board"){ if(!boardEl.innerHTML) renderBoard(); gapsEl.classList.remove("open"); }
      if(v==="globe"){ fit2(); }
      if(v==="map"){ apply(); }
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function(b){
      b.onclick = function(){ setView(b.getAttribute("data-view")); };
    });

    /* ---- boot ---- */
    function onResize(){
      if(curView === "globe"){ fit2(); return; }
      if(z <= FITMAX) fit(); else apply();
    }
    window.addEventListener("resize", onResize);
    fit();

    return function cleanup(){
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <svg style={{display:"none"}}>
        <symbol id="pfz" viewBox="0 0 756 307">
          <path d="M739.975 136.411C729.945 136.411 719.26 142.866 710.894 156.227L715.783 137.862H687.76L664.828 222.181H692.851L703.233 184.25C707.416 168.738 717.597 153.575 724.351 153.575C731.608 153.575 728.887 167.136 741.436 167.136C750.508 167.136 756.002 158.829 756.002 151.223C755.951 142.366 748.895 136.411 739.975 136.411Z" fill="#0000C9"/>
          <path d="M631.361 209.521C617.35 209.721 609.891 200.864 609.891 185.151C609.891 184.101 609.941 183.1 609.992 182.099H665.028C666.137 177.945 666.843 173.442 666.843 169.288C666.843 150.123 654.999 135.511 630.807 135.511C606.615 135.511 584.086 159.731 584.086 185.151C584.086 210.572 600.113 224.333 626.825 224.333C638.669 224.333 650.312 220.38 658.476 214.225L653.386 201.565C647.036 206.469 639.224 209.371 631.361 209.521ZM631.21 149.222C639.375 149.222 643.558 154.476 643.558 166.036C643.558 167.137 643.508 168.288 643.356 169.489H611.957C615.384 157.279 622.692 149.222 631.21 149.222Z" fill="#0000C9"/>
          <path d="M593.007 137.863H518.818L515.139 151.774H551.074L495.332 222.181H573.906L577.534 208.27H537.114L593.007 137.863Z" fill="#0000C9"/>
          <path d="M451.181 137.862L454.407 126.103C456.02 119.948 458.792 109.489 462.572 97.3791C466.553 84.919 473.861 77.1626 483.689 77.1626C488.427 77.1626 491.35 79.3144 491.35 82.9173C491.149 86.8706 487.873 89.2225 487.873 95.5777C487.873 102.984 494.223 108.738 502.438 108.738C512.619 108.738 520.784 100.632 520.784 90.6737C520.784 75.3111 507.529 65.2029 487.318 65.2029C457.683 65.2029 438.229 83.9682 426.032 127.854L376.539 306.45H404.561L447.301 151.673H476.432L457.28 222.081H485.302L508.234 137.762H451.181V137.862Z" fill="#0000C9"/>
          <path d="M413.481 130.106C413.481 110.24 397.857 95.7781 374.169 95.7781H328.356L293.781 222.181H322.711L335.462 175.593H360.561C389.289 175.593 413.481 157.178 413.481 130.106ZM349.473 160.781H339.544L353.253 110.59H363.686C376.84 110.59 384.249 119.447 384.249 131.157C384.199 149.922 369.381 160.781 349.473 160.781Z" fill="#0000C9"/>
          <path d="M1.96484 165.736C2.31764 164.735 2.67044 163.785 3.17444 162.834C15.0688 138.964 65.9224 129.106 138.801 137.864L153.467 84.3198C78.472 74.8621 23.7376 85.5208 14.6152 119.398L1.96484 165.736Z" fill="#0095FF"/>
          <path d="M275.639 109.991C275.337 110.791 275.034 111.592 274.682 112.393C263.291 136.613 212.236 146.621 138.803 137.814L124.137 191.357C199.132 200.815 253.866 190.156 262.989 156.279L275.639 109.991Z" fill="#0000C9"/>
          <path d="M49.9453 53.5437C160.624 61.4501 273.671 115.794 262.986 156.378L272.915 120.148C276.09 108.739 277.653 102.834 277.653 98.08C277.653 56.7463 168.537 6.30514 64.6117 0L49.9453 53.5437Z" fill="#0095FF"/>
          <path d="M227.657 222.132C116.978 214.275 3.9312 159.931 14.6664 119.348L4.7376 155.577C1.5624 166.987 0 172.892 0 177.645C0 218.979 109.116 269.42 213.041 275.725L227.657 222.132Z" fill="#0000C9"/>
        </symbol>
      </svg>

      <header className="top">
        <div className="row">
          <svg className="logo" aria-label="Pfizer" role="img"><use href="#pfz" /></svg>
          <div className="ttl">Ecosystem Infrastructure Map<small>CXI+AI / OSS&AI · ownership, flow and gaps</small></div>
          <span className="draft">V1.0</span>
          <div className="spacer"></div>
          <div className="seg" role="group" aria-label="View">
            <button type="button" data-view="map" aria-pressed="true">Map</button>
            <button type="button" data-view="globe" aria-pressed="false">Atlas</button>
            <button type="button" data-view="board" aria-pressed="false">Estate board</button>
          </div>
        </div>
      </header>

      <div className="bar">
        <div className="zoomctl">
          <button className="zbtn" id="zout" type="button" aria-label="Zoom out">−</button>
          <button className="zbtn" id="zin" type="button" aria-label="Zoom in">+</button>
          <button className="zbtn wide" id="zfit" type="button">Whole estate</button>
        </div>
        <span className="lvl" id="lvl"></span>
        <div className="lgd" id="lgd"></div>
        <div className="spacer"></div>
        <button className="zbtn wide" id="gorph" type="button" aria-pressed="false">Isolate orphans</button>
        <button className="zbtn wide" id="gapsBtn" type="button">Gaps identified</button>
      </div>

      <div className="stage" id="stage">
        <svg id="svg" role="application" aria-label="Interactive infrastructure map"></svg>
        <div className="hint">Scroll to zoom · drag to pan · click a layer to dive in</div>
      </div>

      <div className="stage" id="stage2" hidden>
        <svg id="svg2" role="application" aria-label="Atlas view of the ecosystem"></svg>
        <div className="hint">Clusters are layers · atoms are components, sized by what depends on them · bonds are integrations</div>
      </div>

      <div className="board" id="board"></div>
      <aside className="panel" id="panel" aria-live="polite"></aside>
      <section className="gaps" id="gaps"></section>
    </>
  );
}
