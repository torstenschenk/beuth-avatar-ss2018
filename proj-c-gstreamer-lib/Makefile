CC = g++
CFLAGS = -g -Wall
SRCS = main.cpp
PROG = out

GSTR = `pkg-config gstreamer-1.0 --cflags --libs`
LIBS = $(GSTR)

$(PROG):$(SRCS)
	$(CC) $(CFLAGS) -o $(PROG) $(SRCS) $(LIBS)
