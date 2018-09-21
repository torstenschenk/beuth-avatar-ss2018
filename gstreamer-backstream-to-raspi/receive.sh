#!/bin/bash


#gst-launch-1.0 v4l2src ! video/x-raw ! omxh264enc ! rtph264pay pt=96 config-interval=1 ! udpsink host=192.168.178.26 port=800 alsasrc device=plughw:1,0 ! audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink host=192.168.178.25 port=8007


# Receive V/A from ts Laptop
#gst-launch-1.0 udpsrc port=8009 ! application/x-rtp, clock-rate=44100,payload=97 ! rtpL16depay ! audioconvert ! alsasink sync=false udpsrc port=8010 caps="application/x-rtp,media=video,payload=96,encoding-name=H264" ! rtph264depay ! avdec_h264 ! autovideosink


#gst-launch-1.0 udpsrc port=8009 ! application/x-rtp, clock-rate=44100,payload=97 ! rtpL16depay ! audioconvert ! alsasink sync=false udpsrc port=8010 ! rtph264depay ! avdec_h264 ! autovideosink

# gst-launch-1.0 udpsrc port=8009 ! application/x-rtp, clock-rate=44100,payload=97 ! rtpL16depay ! audioconvert ! alsasink sync=false

#gst-launch-1.0 -v udpsrc port=5001 caps="application/x-rtp" ! queue ! rtppcmudepay ! mulawdec ! audioconvert ! autoaudiosink sync=false

#gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp,encoding-name=JPEG,payload=26" ! rtpjpegdepay ! jpegdec ! autovideosink


#gst-launch-1.0 udpsrc port=8001 ! application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=96 ! rtpopusdepay ! opusdec ! alsasink sync=false udpsrc port=8000 caps="application/x-rtp,media=video,payload=96,encoding-name=H264" ! rtph264depay ! avdec_h264 ! autovideosinki

# JPEG receiver
# gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)JPEG, a-framerate=(string)10, payload=(int)26, ssrc=(uint)1101825956, timestamp-offset=(uint)3183219043, seqnum-offset=(uint)8609" ! rtpjpegdepay ! jpegdec ! autovideosink

# RAW receiver
gst-launch-1.0 udpsrc port=1234 caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)RAW, sampling=(string)YCbCr-4:2:2, depth=(string)8, width=(string)1280, height=(string)720, colorimetry=(string)BT601-5, payload=(int)96, a-framerate=(string)10" ! rtpvrawdepay ! queue ! videoconvert ! autovideosink


