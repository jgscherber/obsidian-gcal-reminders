 #reminder [2025-01-29 05:00](https://www.google.com/calendar/event?eid=Z2trYmhkMXAxZ2s1OWs1aG9tN3A3cmQ4ODggamdzY2hlcmJlckBt) ^c95w8f
  #reminder [2025-01-29 05:00](https://www.google.com/calendar/event?eid=OGw2amVndjkxZThpcG43cWVtZDZiY3Zyc2MgamdzY2hlcmJlckBt) ^039gu5
   #reminder [2025-01-29 05:00](https://www.google.com/calendar/event?eid=NGtpdDR2Y2E5bGRudDNwaWRrdXFrbmhvM28gamdzY2hlcmJlckBt) ^vdjsiz
    #reminder [2025-01-29 05:00](https://www.google.com/calendar/event?eid=NjdpNHB1cjdwbG1ybzM5MjNja3MwZnZ1dGMgamdzY2hlcmJlckBt) ^6aa3rw

IDK why this doesn't work
```dataview
list without id
L.text
from #reminder
flatten file.lists as L
where contains(L.tags, "#reminder")
```

#reminder  testing


```dataview
list
L.text
from #reminder
flatten file.lists as L
```

