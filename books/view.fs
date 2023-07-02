system.parse(`

TRUE      :VARIABLE AutoScroll
UNDEFINED :VARIABLE SelectedTarget
TRUE      :VARIABLE DefaultVisibility
1.000     :VARIABLE DefaultOpacity
OBJECT    :VARIABLE TargetOpacity
OBJECT    :VARIABLE TargetColour

"#666" VALUE TimestampColour
"#ccc" VALUE InboundColour
"#29a" VALUE OutboundColour
"#ce5" VALUE AlertColour

"#view" DOCUMENT QUERY-SELECTOR VALUE #view

: TIMESTAMP-ELEMENT { -- element }
  "span" CREATE-ELEMENT { element }
  TimestampColour element COLOUR!
  HH:MM:SS element APPEND
  " " element APPEND
  element ;

: TEXT>ELEMENT { text colour opacity visibility -- element }
  "p" CREATE-ELEMENT { element }
  text element APPEND
  colour element COLOUR!
  opacity element OPACITY!
  visibility element DISPLAY!
  element ;

: TEXT { message colour panel class -- }
  DefaultVisibility ?                            { visibility }
  DefaultOpacity ?                               { opacity }
  message colour opacity visibility TEXT>ELEMENT { element }
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

: TARGET-VISIBILITY? { target -- }
  UNDEFINED SelectedTarget ? = { untargetted }
  target    SelectedTarget ? = { matched }
  untargetted matched OR IF "block" ELSE "none" THEN ;

: TARGET>ELEMENT { target -- element }
  "span" CREATE-ELEMENT { element }
  target TARGET-COLOUR? { colour }
  colour element COLOUR!
  "target" element CLASS!
  target element APPEND
  " " element APPEND
  element ;

: MESSAGE>ELEMENT { text target -- element }
  target TARGET>ELEMENT                              { targetElement }
  target TARGET-VISIBILITY?                          { visibility }
  target TARGET-OPACITY?                             { opacity }
  text InboundColour opacity visibility TEXT>ELEMENT { element }
  targetElement element PREPEND
  "message" element CLASS!
  element ;

: SCROLL-VIEW ( -- )
  AutoScroll ? IF
    "scrollHeight" #view ? "scrollTop" #view !
  THEN ;

: MESSAGE { message target panel -- }
  message target MESSAGE>ELEMENT { element }
  TIMESTAMP-ELEMENT element PREPEND
  element panel APPEND
  SCROLL-VIEW ;

: REFRESH-MESSAGE { line -- }
  ".target" line QUERY-SELECTOR { element }
  element TEXT? TRIM            { target }
  target TARGET-VISIBILITY?     { visibility }
  target TARGET-OPACITY?        { opacity }
  target TARGET-COLOUR?         { colour }
  colour element COLOUR!
  opacity line OPACITY!
  visibility line DISPLAY! ;

: REFRESH-LINE { line -- }
  DefaultOpacity ? line OPACITY!
  SelectedTarget ? IF "none" ELSE "block" THEN
  line DISPLAY! ;

: REFRESH ( -- )
  "#view p" DOCUMENT QUERY-ALL TO-ARRAY { lines }
  BEGIN lines COUNT WHILE
    lines POP   { line }
    line CLASS? { class }
    "message" class = IF
      line REFRESH-MESSAGE
    ELSE
      line REFRESH-LINE
     THEN
  REPEAT ;

`);
