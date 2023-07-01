system.parse(`

PUBLISH IRC

VARIABLE YourNick
VARIABLE YourUser
VARIABLE YourName
VARIABLE Socket
VARIABLE KeepAlive

: WEB-SOCKET { uri -- websocket }
  uri 1 "WebSocket" NEW ;

: SEND { message -- }
  message 1 "send" Socket ? METHOD
  message OutboundColour #view "sent" TEXT ;

: IDENTITY! { nick user name -- }
  nick YourNick ! user YourUser ! name YourName ! ;

: IDENTIFY { event -- }
  <[ "NICK" YourNick ? ]> " " JOIN SEND
  <[ "USER " YourUser ? " 0 0 :" YourName ? ]> "" JOIN SEND ;

: DISCONNECT { event -- }
  KeepAlive ? IF
    KeepAlive ? CLEAR-INTERVAL
    UNDEFINED KeepAlive !
  THEN
  "Disconnected!" AlertColour #view "alert" TEXT ;

: CONNECT { uri -- web-socket }
  uri WEB-SOCKET { web-socket }
  "IDENTIFY"   ON-EVENT "open"    web-socket ADD-EVENT-LISTENER
  "DISCONNECT" ON-EVENT "close"   web-socket ADD-EVENT-LISTENER
  "PARSE-LINE" ON-EVENT "message" web-socket ADD-EVENT-LISTENER
  web-socket ;

: KEEP-ALIVE { action interval -- id }
  0 action ENCODE FUNCTION { function }
  function interval SET-INTERVAL KeepAlive ! ;

`);
