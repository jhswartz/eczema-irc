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
  message OutboundColour DefaultOpacity ? #view "sent" TEXT ;

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
  "Disconnected!" AlertColour DefaultOpacity ? #view "alert" TEXT ;

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
system.parse(`

OBJECT VALUE Names
OBJECT VALUE Users

OBJECT :VARIABLE Channels

: DROP-COLON { token -- token }
  token IF
    0 token ? ":" = IF
      1 token SLICE { token }
    THEN
  THEN
  token ;

: PONG { type -- }
  <[ "PONG" type ]> " " JOIN { message }
  message 1 "send" Socket ? METHOD ;

: PARSE-MOVEMENT { source type remaining -- }
  0 remaining ? DROP-COLON   { target }
  <[ type source ]> " " JOIN { message }
  message target #view MESSAGE ;

: PARSE-INFO { source type remaining -- }
  1 remaining ?               { channel }
  2 remaining SLICE " " JOIN  { info }
  <[ "INFO" topic ]> " " JOIN { message }
  message channel #view MESSAGE ;

: PARSE-TOPIC { source type remaining -- }
  1 remaining ?                { channel }
  2 remaining SLICE " " JOIN   { topic }
  <[ "TOPIC" topic ]> " " JOIN { message }
  message channel #view MESSAGE ;

: PARSE-MODE { source type remaining -- }
  0 remaining ? DROP-COLON              { target }
  1 remaining ?                         { flags }
  2 remaining SLICE " " JOIN DROP-COLON { subject }
  <[ "MODE" flags subject ]> " " JOIN   { message }
  message target #view MESSAGE ;

: PARSE-NICK { source -- }
  source "!" SPLIT { tokens }
  0 tokens ? ;

: ADORN-NICK { type nick -- }
  type "NOTICE" = IF
    "(" { introducer }
    ")" { terminator }
  ELSE
    "<" { introducer }
    ">" { terminator }
  THEN
  <[ introducer nick terminator ]> "" JOIN ;

: PARSE-MESSAGE { source type remaining -- }
  0 remaining ? DROP-COLON              { target }
  1 remaining SLICE " " JOIN DROP-COLON { text }
  source PARSE-NICK                     { nick }
  type nick ADORN-NICK                  { from }
  <[ from text ]> " " JOIN              { message }
  message target #view MESSAGE ;

: PARSE-NAMES { source type remaining -- }
  2 remaining ?        { channel }
  channel Names ?      { existing }
  3 remaining SLICE    { names }
  0 names ? DROP-COLON { first }
  first 0 names !

  existing IF
    existing names CONCAT { names }
  THEN

  names channel Names ! ;

: PARSE-END-NAMES { source type remaining -- }
  1 remaining ?                 { channel }
  channel Names ? SORT " " JOIN { names }
  <[ "NAMES" names ]> " " JOIN  { message }
  message channel #view MESSAGE
  ARRAY channel Names ! ;

: PARSE-WHO { source type remaining -- }
  1 remaining ? { channel }
  5 remaining ? { nick }
  <{
    "username" 2 remaining ?
    "address"  3 remaining ?
    "info"     8 remaining SLICE " " JOIN
  }> nick Users ! ;

: PARSE-END-WHO { source type remaining -- }
  1 remaining ?   { channel }
  Users KEYS SORT { nicks }

  BEGIN nicks COUNT WHILE
    nicks POP    { nick }
    nick Users ? { user }
    <[
      "WHO" nick
      "username" user ?
      "address"  user ?
      "info"     user ?
    ]> " " JOIN channel #view MESSAGE
    nick Users DELETE
  REPEAT ;

: PARSE-WHOIS-USER { source type remaining -- }
  1 remaining ?                               { nick }
  2 remaining ?                               { user }
  3 remaining ?                               { address }
  5 remaining SLICE " " JOIN                  { info }
  <[ "IDENTITY" user address info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CHANNELS { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { channels }
  <[ "CHANNELS" channels ]> " " JOIN    { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-SERVER { source type remaining -- }
  1 remaining ?                       { nick }
  2 remaining ?                       { server }
  3 remaining SLICE " " JOIN          { info }
  <[ "SERVER" server info ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-CONNECTION { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-HOST { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACTUALLY { source type remaining -- }
  1 remaining ?              { nick }
  2 remaining ?              { host }
  <[ "HOST" host ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-IDLE { source type remaining -- }
  1 remaining ? { nick }
  2 remaining ? { idle }
  <[ "IDLE"
     <[ idle DAYS?    "d" ]> "" JOIN
     <[ idle HOURS?   "h" ]> "" JOIN
     <[ idle MINUTES? "m" ]> "" JOIN
     <[ idle SECONDS? "s" ]> "" JOIN
  ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-AWAY { source type remaining -- }
  1 remaining ?                         { nick }
  2 remaining SLICE " " JOIN DROP-COLON { reason }
  <[ "AWAY" reason ]> " " JOIN          { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-ACCOUNT { source type remaining -- }
  1 remaining ?                    { nick }
  2 remaining ?                    { account }
  <[ "ACCOUNT" account ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-WHOIS-REGISTERED { source type remaining -- }
  1 remaining ?                    { nick }
  <[ "REGISTERED" nick ]> " " JOIN { message }
  message nick #view MESSAGE ;

: PARSE-LIST { source type remaining -- }
  1 remaining ? { channel }
  <{
    "users" 2 remaining ?
    "topic" 3 remaining SLICE " " JOIN DROP-COLON
  }> channel Channels ? ! ;

: PARSE-END-LIST { source type remaining -- }
  Channels ? KEYS SORT         { names }
  BEGIN names COUNT WHILE
    names POP                  { name }
    name Channels ? ?          { channel }
    "users" channel ?          { users }
    "topic" channel ?          { topic }
    <[ users topic ]> " " JOIN { info }
    info name #view MESSAGE
  REPEAT
  OBJECT Channels ! ;

: IGNORE-LINE { source type remaining -- } ;

<{
  "JOIN"    ' PARSE-MOVEMENT
  "PART"    ' PARSE-MOVEMENT
  "MODE"    ' PARSE-MODE
  "PRIVMSG" ' PARSE-MESSAGE
  "NOTICE"  ' PARSE-MESSAGE
  "331"     ' PARSE-INFO
  "332"     ' PARSE-TOPIC
  "353"     ' PARSE-NAMES
  "366"     ' PARSE-END-NAMES
  "352"     ' PARSE-WHO
  "315"     ' PARSE-END-WHO
  "311"     ' PARSE-WHOIS-USER
  "314"     ' PARSE-WHOIS-USER
  "319"     ' PARSE-WHOIS-CHANNELS
  "312"     ' PARSE-WHOIS-SERVER
  "671"     ' PARSE-WHOIS-CONNECTION
  "378"     ' PARSE-WHOIS-HOST
  "338"     ' PARSE-WHOIS-ACTUALLY
  "317"     ' PARSE-WHOIS-IDLE
  "330"     ' PARSE-WHOIS-ACCOUNT
  "307"     ' PARSE-WHOIS-REGISTERED
  "301"     ' PARSE-AWAY
  "322"     ' PARSE-LIST
  "323"     ' PARSE-END-LIST
  "318"     ' IGNORE-LINE
  "333"     ' IGNORE-LINE
  "369"     ' IGNORE-LINE
}>
VALUE LineTypes

: PARSE-LINE { event -- }
  "data" event ?        { data }
  data " " SPLIT        { tokens }
  0 tokens ? DROP-COLON { source }
  1 tokens ?            { type }
  2 tokens SLICE        { remaining }

  source "PING" = IF
    type PONG
    EXIT
  THEN

  type LineTypes KEYS CONTAINS IF
    type LineTypes ? { parser }
    source type remaining parser EXECUTE
    EXIT
  THEN

  data InboundColour DefaultOpacity ? #view "unparsed" TEXT ;

`);
system.parse(`

: /quit { message -- }
  <[ "QUIT :" message ]> "" JOIN SEND ;

: /list { pattern -- }
  <[ "LIST" pattern ]> " " JOIN SEND ;

: /part { channel -- }
  <[ "PART" channel ]> " " JOIN SEND ;

: /join { channel -- }
  <[ "JOIN" channel ]> " " JOIN SEND ;

: /topic { channel -- }
  <[ "TOPIC" channel ]> " " JOIN SEND ;

: /msg { message target -- }
  <[ "PRIVMSG " target " :" message ]> "" JOIN SEND ; 

: /notice { message target -- }
  <[ "NOTICE " target " :" message ]> "" JOIN SEND ; 

: /whois { nick -- }
  <[ "WHOIS" nick nick ]> " " JOIN SEND ;

: /whowas { nick -- }
  <[ "WHOWAS" nick ]> " " JOIN SEND ;

: /who { channel -- }
  <[ "WHO" channel ]> " " JOIN SEND ;

: /names { channel -- }
  <[ "NAMES" channel ]> " " JOIN SEND ;

: /nick { nick -- }
  <[ "NICK" nick ]> " " JOIN SEND ;

: /identify { account password -- }
  <[ "IDENTIFY" account password ]> " " JOIN "NickServ" /msg ;

: /release { account password -- }
  <[ "RELEASE" account password ]> " " JOIN "NickServ" /msg ;

: /ghost { account password -- }
  <[ "GHOST" account password ]> " " JOIN "NickServ" /msg ;

: /colour { colour target -- }
  colour target TargetColour ? !
  REFRESH ;

: /opacity { opacity target -- }
  opacity target TargetOpacity ? !
  REFRESH ;

: /focus { target -- }
  <{ target 1.000 }> TargetOpacity !
  0.250 DefaultOpacity !
  REFRESH ;

: /defocus ( -- )
  OBJECT TargetOpacity !
  1.000 DefaultOpacity !
  REFRESH ;

`);
system.parse(`

1.000  :VARIABLE DefaultOpacity
OBJECT :VARIABLE TargetOpacity
OBJECT :VARIABLE TargetColour

"#666" VALUE TimestampColour
"#ccc" VALUE InboundColour
"#29a" VALUE OutboundColour
"#ce5" VALUE AlertColour

"#view" DOCUMENT QUERY-SELECTOR VALUE #view

: CURRENT-TIME { -- timestamp }
  0 "Date" NEW                        { date }
  0 "getHours"   date METHOD "00" FIT { hour }
  0 "getMinutes" date METHOD "00" FIT { minute }
  0 "getSeconds" date METHOD "00" FIT { seconds }
  <[ hour ":" minute ":" seconds " " ]> "" JOIN ;

: TIMESTAMP-ELEMENT { -- element }
  "span" CREATE-ELEMENT { element }
  TimestampColour element COLOUR!
  CURRENT-TIME element APPEND
  element ;

: TEXT>ELEMENT { text colour opacity -- element }
  "p" CREATE-ELEMENT { element }
  colour element COLOUR!
  opacity element OPACITY!
  text element APPEND
  element ;

: TEXT { message colour opacity panel class -- }
  message colour opacity TEXT>ELEMENT { element }
  TIMESTAMP-ELEMENT element PREPEND
  class element CLASS!
  element panel APPEND
  SCROLL-VIEW ;

: TARGET-COLOUR? { target -- }
  target TargetColour ? KEYS CONTAINS IF
    target TargetColour ? ?
  ELSE
    InboundColour
  THEN ;

: TARGET-OPACITY? { target -- }
  target TargetOpacity ? KEYS CONTAINS IF
    target TargetOpacity ? ?
  ELSE
    DefaultOpacity ?
  THEN ;

: TARGET>ELEMENT { target -- element }
  "span" CREATE-ELEMENT { element }
  target TARGET-COLOUR? { colour }
  colour element COLOUR!
  "target" element CLASS!
  <[ target " " ]> "" JOIN element APPEND
  element ;

: MESSAGE>ELEMENT { text target -- element }
  target TARGET>ELEMENT                   { targetElement }
  target TARGET-OPACITY?                  { opacity }
  text InboundColour opacity TEXT>ELEMENT { element }
  targetElement element PREPEND
  "message" element CLASS!
  element ;

: SCROLL-VIEW ( -- )
  "scrollHeight" #view ? "scrollTop" #view ! ;

: MESSAGE { message target panel -- }
  message target MESSAGE>ELEMENT { element }
  TIMESTAMP-ELEMENT element PREPEND
  element panel APPEND
  SCROLL-VIEW ;

: REFRESH { -- }
  "#view p" DOCUMENT QUERY-ALL TO-ARRAY { lines }

  BEGIN lines COUNT WHILE
    lines POP   { line }
    line CLASS? { class }

    "message" class <> IF
      DefaultOpacity ? line OPACITY!

    ELSE
      ".target" line QUERY-SELECTOR { element }
      element TEXT? TRIM            { target }
      target TARGET-OPACITY?        { opacity }
      target TARGET-COLOUR?         { colour }
      colour element COLOUR!
      opacity line OPACITY!
    THEN
  REPEAT ;

"WORDS?" READ

`);
