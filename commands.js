system.parse(`

: /quit { message -- }
  <[ "QUIT :" message ]> "" JOIN SEND ;

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

`);
