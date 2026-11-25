import json,os,html,re,sys
# Usage: build_viewer.py [folder]  (folder holds canvas/; defaults to the design-refresh root)
ROOT=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=ROOT+"/canvas/"
c=json.load(open(D+"canvas.json"))
boards={}
for k,b in c["boards"].items():
    s=open(D+k,encoding="utf-8").read()
    s=s.replace('<script src="./support.js"></script>','')
    s=re.sub(r'<script type="text/x-dc".*?</script>','',s,flags=re.S)
    boards[k]=dict(b,html=s)
pages=c.get("pages") or [{"id":"main","name":"Canvas"}]
for b in boards.values(): b.setdefault("page",pages[0]["id"])
notes={k:dict(n,page=n.get("page",pages[0]["id"])) for k,n in c.get("notes",{}).items()}
data={"title":c.get("title",""),"pages":pages,"boards":boards,"notes":notes}
tpl=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"viewer_template.html"),encoding="utf-8").read()
js=json.dumps(data,ensure_ascii=False).replace("</","<\\/")
out=tpl.replace("/*__DATA__*/null",js)
open(os.path.join(ROOT,"index.html"),"w",encoding="utf-8").write(out)
print("wrote index.html",len(out)//1024,"KB")
