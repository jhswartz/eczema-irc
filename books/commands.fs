system.parse(`

: /quit { message -- }
  <[ "QUIT :" message ]> "" JOIN SEND ;

: /mode? { target -- }
  <[ "MODE" target ]> " " JOIN SEND ;

: /mode! { mode target -- }
  <[ "MODE " target " :" mode ]> "" JOIN SEND ;

: /list { pattern -- }
  <[ "LIST" pattern ]> " " JOIN SEND ;

: /part { channel -- }
  <[ "PART" channel ]> " " JOIN SEND ;

: /join { channel -- }
  <[ "JOIN" channel ]> " " JOIN SEND ;

: /topic? { channel -- }
  <[ "TOPIC" channel ]> " " JOIN SEND ;

: /topic! { topic channel -- }
  <[ "TOPIC " channel " :" topic ]> "" JOIN SEND ;

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

: /select { target -- }
  target SelectedTarget !
  "none" DefaultVisibility !
  REFRESH SCROLL-VIEW ;

: /deselect ( -- )
  UNDEFINED SelectedTarget !
  "block" DefaultVisibility !
  REFRESH SCROLL-VIEW ;

`);
