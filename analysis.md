```plantuml
title cors-anywhere function


participant UserScript as user

participant "http(s)" as http
participant "cors-anywhere" as cors
participant "http-proxy" as proxy
participant server

[-> cors ++: <<create>>
cors -> http ++: set listener

deactivate cors

group session

activate user
user -> http : request
http -> cors ++: listen
cors -> cors : check basic info
cors -> proxy ++ : set listener
cors -> proxy : start session
proxy -> server : request


server -> proxy :response
proxy -> cors : listen
cors -> cors : check redirect
cors -> cors : change header
cors -> proxy --: call handler

proxy -> proxy :wait for stream ends
proxy -> user --: response

end group

```


```plantuml
title node-bitmap-proxy


participant UserScript as user

participant "http(s)" as http
participant "bitmap-proxy" as bitmap #orange
participant "cors-anywhere" as cors
participant "http-proxy" as proxy
participant server

[-> bitmap ++#yellow : <<create>> 
bitmap -> cors ++: set listener
cors -> http ++: set listener

deactivate cors

group session

activate user
user -> http : request
http -> cors ++: listen
cors -> bitmap : listen
bitmap -> bitmap : check if image request
bitmap -> cors !!: detected image request
bitmap -> bitmap : decode original request
' bitmap -> cors  : set listener
' bitmap --> proxy :set listener?
bitmap -> cors ++: restart with original request
cors -> cors : check basic info
cors -> proxy ++ : set listener
cors -> proxy : start session
proxy -> server : request


server -> proxy :response
proxy -> cors : listen
cors -> cors : check redirect
' cors -> bitmap : register handler

' note left
'     importするなら
'     わざわざコールバックしなくても良い
'     change headerはデータを撹乱するので、
'     その場合削除は必要
' end note

' ' bitmap --> proxy :set listener?
' bitmap -> bitmap : wait for another event
cors -> proxy --: call handler
proxy -> proxy :wait for stream ends
proxy -> bitmap --: stream ends

group stream.Transform
    bitmap -> bitmap : embed response into image
    bitmap -> bitmap : compress and crypt
    bitmap -> bitmap : rewrite header
    ' bitmap -> cors : call response handler
    ' cors -> bitmap : change header
end

bitmap -> user : response

end session

```

```plantuml

title bitmap-proxy function call

start

:req, imageResが与えられる;

:reqからoriginalReqを取得
receiverResを構成;

:





```
