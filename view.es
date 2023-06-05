system.parse(`

OBJECT VALUE TargetColour

"#ccc" VALUE InboundColour
"#29a" VALUE OutboundColour
"#ce5" VALUE AlertColour

"#view" QUERY-SELECTOR VALUE #view

: SCROLL-VIEW ( -- )
  "scrollHeight" #view ? "scrollTop" #view ! ;

: TEXT>ELEMENT { text colour -- element }
  "p" CREATE-ELEMENT { element }
  colour "color" element STYLE? !
  text element APPEND
  element ;

: TEXT { message colour panel -- }
  message colour TEXT>ELEMENT { element }
  element panel APPEND
  SCROLL-VIEW ;

: TARGET-COLOUR? { target -- }
  target TargetColour KEYS CONTAINS IF
    target TargetColour ?
  ELSE
    InboundColour
  THEN ;

: TARGET>ELEMENT { target -- element }
  "span" CREATE-ELEMENT { element }
  target TARGET-COLOUR? { colour }
  colour "color" element STYLE? !
  <[ target " " ]> "" JOIN element APPEND
  element ;

: MESSAGE>ELEMENT { text target -- element }
  target TARGET>ELEMENT { targetElement }
  text InboundColour TEXT>ELEMENT { element }
  targetElement element PREPEND
  element ;

: MESSAGE { message target panel -- }
  message target MESSAGE>ELEMENT { element }
  element panel APPEND
  SCROLL-VIEW ;

"WORDS?" READ

`);
