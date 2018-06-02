#!/bin/sh
# for Linux

#gst-launch-1.0 \
#        v4l2src device=/dev/video0 \
#        ! videoconvert ! videoscale ! video/x-raw,width=320,height=240 \
#        ! clockoverlay shaded-background=true font-desc="Sans 38" \
#! theoraenc ! oggmux ! tcpserversink host=127.0.0.1 port=8080

#gst-launch-1.0 -v v4l2src device="/dev/video0" ! videoconvert ! videoscale \
#	! video/x-raw,width=300,height=300 \
# 	!  theoraenc ! oggmux ! rtpjitterbuffer mode=0 !  tcpserversink host=127.0.0.1 port=8080  
	
gst-launch-1.0 -v videotestsrc ! vp8enc ! webmmux streamable=true name=stream ! \
	tcpserversink host=localhost port=8080 	



