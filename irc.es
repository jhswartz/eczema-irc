system.parse(`

PUBLISH IRC

VARIABLE YourNick
VARIABLE YourUser
VARIABLE YourName
VARIABLE Socket

: WEB-SOCKET { uri -- websocket }
  uri 1 "WebSocket" NEW ;

: SEND { message -- }
  message 1 "send" Socket ? METHOD
  message OutboundColour #view TEXT ;

: IDENTITY! { nick user name -- }
  nick YourNick ! user YourUser ! name YourName ! ;

: IDENTIFY { event -- }
  <[ "NICK" YourNick ? ]> " " JOIN SEND
  <[ "USER " YourUser ? " 0 0 :" YourName ? ]> "" JOIN SEND ;

: WHEN-CLOSED { event -- }
  "Disconnected!" AlertColour #view TEXT ;

: CONNECT { uri -- web-socket }
  uri WEB-SOCKET         { web-socket }
  "IDENTIFY"    ON-EVENT { on-open }
  "WHEN-CLOSED" ON-EVENT { on-close }
  "PARSE-LINE"  ON-EVENT { on-line }

  on-open  "open"    web-socket ADD-EVENT-LISTENER
  on-close "close"   web-socket ADD-EVENT-LISTENER
  on-line  "message" web-socket ADD-EVENT-LISTENER 

  web-socket ;

`);
