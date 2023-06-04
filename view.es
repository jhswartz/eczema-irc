system.parse(`

OBJECT VALUE TargetColour

"#ccc" VALUE InboundColour
"#29a" VALUE OutboundColour
"#ce5" VALUE AlertColour

"#view" QUERY-SELECTOR VALUE #view

: SCROLL-VIEW ( -- )
  "scrollHeight" #view ? "scrollTop" #view ! ;

: MESSAGE-ELEMENT { text colour -- }
  "p" CREATE-ELEMENT { element }
  colour "color" element STYLE? !
  text element APPEND
  element ;

: MESSAGE { message colour panel -- }
  message colour MESSAGE-ELEMENT { element }
  element panel APPEND
  SCROLL-VIEW ;

: MESSAGE-COLOUR? { target -- }
  target TargetColour KEYS CONTAINS IF
    target TargetColour ?
  ELSE
    InboundColour
  THEN ;

: DISPLAY-MESSAGE { message target panel -- }
  target MESSAGE-COLOUR? { colour }
  message colour panel MESSAGE ;

"WORDS?" READ

`);
