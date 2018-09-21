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

# C920 Webcam (audio not tested)
#Sender PC
#gst-launch-1.0 -v v4l2src device=/dev/video1 ! h264parse ! rtph264pay config-interval=1 pt=96 ! udpsink host=192.168.178.25 port=8004 alsasrc device=plughw:CARD=PCH,DEV=0 ! audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink host=192.168.178.25 port=8005
#Reveiver Raspi
#gst-launch-1.0 udpsrc port=8005 ! application/x-rtp, clock-rate=44100,payload=97 ! rtpL16depay ! audioconvert ! alsasink sync=false udpsrc port=8004 caps="application/x-rtp,media=video,payload=96,encoding-name=H264" ! rtph264depay ! avdec_h264 ! autovideosink


# gst-launch-1.0 -v alsasrc device=plughw:CARD=PCH,DEV=0 ! audioconvert ! audio/x-raw,channels=1,depth=16,width=16,rate=44100 ! rtpL16pay pt=97 ! udpsink host=192.168.178.29 port=5001 v4l2src ! videoconvert ! video/x-raw, width=640,height=480 ! x264enc ! rtph264pay pt=96 config-interval=1 ! udpsink host=192.168.178.29

# first try, very bad lag and no sound
# Sender ts laptop integrated camera
#gst-launch-1.0 -v alsasrc device=plughw:CARD=PCH,DEV=0 ! audioconvert ! audio/x-raw,channels=1,depth=16,width=16,rate=44100 ! rtpL16pay pt=97 ! udpsink host=192.168.178.26 port=8009 v4l2src ! videoconvert ! video/x-raw, width=640,height=480 ! x264enc ! rtph264pay pt=96 config-interval=1 ! udpsink host=192.168.178.26 port=8010
# Receiver ts raspi
#gst-launch-1.0 udpsrc port=8009 ! application/x-rtp, clock-rate=44100,payload=97 ! rtpL16depay ! audioconvert ! alsasink sync=false udpsrc port=8010 caps="application/x-rtp,media=video,payload=96,encoding-name=H264" ! rtph264depay ! avdec_h264 ! autovideosink

# neue Idee, geht nicht :(
#gst-launch-1.0 -v v4lrc ! h264parse ! rtph264pay config-interval=1 pt=96 ! gdppay ! tcpserversink host=192.168.178.26 port=5000

#
# more tests
### works :)
gst-launch-1.0 v4l2src ! jpegdec ! xvimagesink

#
gst-launch-1.0 videotestsrc ! autovideosink
# with caps
gst-launch-1.0 videotestsrc ! video/x-raw,width=640,height=480 ! autovideosink
# but stands for
gst-launch-1.0 videotestsrc ! capsfilter caps=video/x-raw,width=640,height=480 ! autovideosink
# feed from camera
gst-launch-1.0 v4l2src device="/dev/video0" ! video/x-raw,width=640,height=480 ! autovideosink
gst-launch-1.0 v4l2src device=/dev/video1 ! video/x-raw,width=640,height=480 ! autovideosink
# screengrabber
gst-launch-1.0 ximagesrc ! videoconvert ! autovideosink

# videoconvert with windows name: ts@pi4-3613 ~/....."
wmctrl -L
gst-launch-1.0 ximagesrc use-damage=false xname="name of window" ! videoconvert ! videoscale ! video/x-raw,width=800,height=600 ! autovideosink

# now simple video streaming via mjpeg
# Sender
gst-launch-1.0 -v ximagesrc use-damage=false xname=/usr/lib/torcs/torcs-bin ! videoconvert ! videoscale ! video/x-raw,format=I420,width=800,height=600,framerate=25/1 ! jpegenc ! rtpjpegpay ! udpsink host=127.0.0.1 port=5000
# Receiver
gst-launch-1.0 udpsrc port=5000 ! application/x-rtp,encoding-name=JPEG,payload=26 ! rtpjpegdepay ! jpegdec ! autovideosink

# works :)
# eigene mit integrated or webcam, for raspi too much cpu load :(
# sender, also without """
 gst-launch-1.0 v4l2src device="/dev/video0" ! video/x-raw,width=640,height=480 ! jpegenc ! rtpjpegpay ! udpsink host=localhost port=5000
# even without video0
gst-launch-1.0 v4l2src ! video/x-raw,width=640,height=480 ! jpegenc ! rtpjpegpay ! udpsink host=localhost port=5000
# receiver
gst-launch-1.0 udpsrc port=5000 ! application/x-rtp,encoding-name=JPEG,payload=26 ! rtpjpegdepay ! jpegdec ! autovideosink
# receiver caps
gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp,encoding-name=JPEG,payload=26" ! rtpjpegdepay ! jpegdec ! autovideosink


# VP8 send and receive screen
### nope ### gst-launch-1.0 -v v4l2src device="/dev/video0"  ! video/x-raw,width=800,height=600 ! vp8enc ! rtpvp8pay ! udpsink host=127.0.0.1 port=5100
# receiver
gst-launch-1.0 udpsrc port=5100 caps="application/x-rtp, clock-rate=(int)90000,   media=(string)video, encoding-name=(string)VP8-DRAFT-IETF-01, payload=(int)96" ! rtpvp8depay ! vp8dec ! autovideosink

# VP8 send and receive video from camera
gst-launch-1.0 -v ximagesrc use-damage=false xname=/usr/lib/torcs/torcs-bin ! videoconvert ! videoscale ! video/x-raw,width=800,height=600 ! vp8enc ! rtpvp8pay ! udpsink host=127.0.0.1 port=5100
# receiver
gst-launch-1.0 udpsrc port=5100 caps="application/x-rtp, clock-rate=(int)90000,   media=(string)video, encoding-name=(string)VP8-DRAFT-IETF-01, payload=(int)96" ! rtpvp8depay ! vp8dec ! autovideosink


# mpeg 4 screen 
# sender
gst-launch-1.0 -v ximagesrc use-damage=false xname=/usr/lib/torcs/torcs-bin ! videoconvert ! videoscale ! video/x-raw,width=800,height=600 ! avenc_mpeg4 ! rtpmp4vpay config-interval=3 ! udpsink host=127.0.0.1 port=5200
# receiver
gst-launch-1.0 udpsrc port=5200 caps="application/x-rtp,media=video,encoding-name=MP4V-ES,payload=96" ! rtpmp4vdepay ! avdec_mpeg4 ! autovideosink


# stream jpeg to raspi
# sender pc
# internal cam
gst-launch-1.0 v4l2src ! video/x-raw,width=320,height=240 ! jpegenc ! rtpjpegpay ! udpsink host=192.168.178.26 port=5000
gst-launch-1.0 v4l2src device=/dev/video0 ! video/x-raw,width=320,height=240 ! jpegenc ! rtpjpegpay ! udpsink host=192.168.178.26 port=5000
# webcam
gst-launch-1.0 v4l2src device=/dev/video1 ! video/x-raw,width=320,height=240 ! jpegenc ! rtpjpegpay ! udpsink host=192.168.178.26 port=5000
# receiver raspi
gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp,encoding-name=JPEG,payload=26" ! rtpjpegdepay ! jpegdec ! autovideosink





#### nochmal stream to raspi from C920 Webcam
#sender
gst-launch-1.0 -v v4l2src device=/dev/video1 ! video/x-h264,width=800,height=600 ! h264parse ! rtph264pay config-interval=1 ! udpsink host=192.168.178.26 port=8000 alsasrc device=plughw:1,0 ! audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink host=192.168.178.26 port=8001

gst-launch-1.0 -v v4l2src device=/dev/video1 ! video/x-h264,width=320,height=240 ! h264parse ! rtph264pay config-interval=1 ! udpsink host=192.168.178.26 port=8000 alsasrc device=plughw:1,0 ! audioconvert ! audioresample ! opusenc ! rtpopuspay ! udpsink host=192.168.178.26 port=8001

#receiver


# JPEG to raspi laggy
#sender pc
gst-launch-1.0 -v v4l2src device=/dev/video1 ! 'video/x-raw,width=640,height=480,framerate=10/1' ! jpegenc ! rtpjpegpay ! udpsink host=192.168.178.26 port=5000
# receiver
gst-launch-1.0 udpsrc port=5000 caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)JPEG, a-framerate=(string)10, payload=(int)26" ! rtpjpegdepay ! jpegdec ! autovideosink



# RAW format
# sender
gst-launch-1.0 -v v4l2src  device=/dev/video1 ! 'video/x-raw, width=(int)800, height=(int)600, framerate=10/1' ! videoconvert ! rtpvrawpay ! udpsink host=192.168.178.24 port=1234
gst-launch-1.0 -v v4l2src  ! 'video/x-raw, width=(int)1280, height=(int)720, framerate=10/1' ! videoconvert ! rtpvrawpay ! udpsink host=192.168.178.24 port=1234

# receiver
gst-launch-1.0 udpsrc port=1234 caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)RAW, sampling=(string)YCbCr-4:2:2, depth=(string)8, width=(string)1280, height=(string)720, colorimetry=(string)BT601-5, payload=(int)96, a-framerate=(string)10" ! rtpvrawdepay ! queue ! videoconvert ! autovideosink


