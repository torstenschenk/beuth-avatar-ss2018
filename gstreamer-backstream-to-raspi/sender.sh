#!/bin/bash

#gst-launch-1.0 -v pulsesrc ! h264parse ! rtph264pay config-interval=1 pt=96 ! \
#    udpsink host=192.168.178.25 port=8004 alsasrc device=plughw:1,0 ! \ 
#    audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink \ 
#    host=192.168.178.25 port=8005


#gst-launch-1.0 -v pulsesrc ! h264parse ! rtph264pay config-interval=1 pt=96 ! \
#    udpsink host=192.168.178.25 port=8004 \
#    alsasrc device=plughw:CARD=PCH,DEV=0 ! queue ! \ 
#    audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink \ 
#    host=192.168.178.25 port=8005


gst-launch-1.0 -v v4l2src device=/dev/video1 ! h264parse ! rtph264pay config-interval=1 pt=96 ! udpsink host=192.168.178.25 port=8004 alsasrc device=plughw:CARD=PCH,DEV=0 ! audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink host=192.168.178.25 port=8005

