import json,os,html,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=ROOT+"/canvas/"
c=json.load(open(D+"canvas.json"))
boards={}
for k,b in c["boards"].items():
    s=open(D+k,encoding="utf-8").read()
    s=s.replace('<script src="./support.js"></script>','')
    s=re.sub(r'<script type="text/x-dc".*?</script>','',s,flags=re.S)
    boards[k]=dict(b,html=s)
notes={k:n for k,n in c["notes"].items()}
data={"title":c.get("title",""),"pages":c["pages"],"boards":boards,"notes":notes}
tpl=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"viewer_template.html"),encoding="utf-8").read()
js=json.dumps(data,ensure_ascii=False).replace("</","<\\/")
out=tpl.replace("/*__DATA__*/null",js)
open(os.path.join(ROOT,"index.html"),"w",encoding="utf-8").write(out)
print("wrote index.html",len(out)//1024,"KB")
