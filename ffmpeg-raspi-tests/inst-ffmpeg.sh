#!/bin/bash
# My first script
# 
# to install ffserver, you have to check out the 3.5 of 3.4 version of ffmepg git repo
# to be able to compile ffmpeg with x264, you also have to choose an old version from git repo
# tested was the version, before x264_bit_depth was removed (needed for ffmpeg 3.4, 3.5)
# x264 hash key checkout: 7839a9e1f03b49e3e0cbfcb3091093af7c6d54ee

wget http://downloads.xiph.org/releases/vorbis/libvorbis-1.3.3.tar.gz
tar -xf libvorbis-1.3.3.tar.gz
cd libvorbis-1.3.3/
./configure --host=arm-unknown-linux-gnueabi --enable-static
make
sudo make install

cd ..

wget http://downloads.xiph.org/releases/ogg/libogg-1.3.1.tar.gz
tar -xf libogg-1.3.1.tar.gz 
cd libogg-1.3.1/
./configure --host=arm-unknown-linux-gnueabi --enable-static
make
sudo make install

cd ..

wget http://downloads.xiph.org/releases/theora/libtheora-1.1.1.tar.bz2
tar -xf libtheora-1.1.1.tar.bz2 
cd libtheora-1.1.1/
./configure --host=arm-unknown-linux-gnueabi --enable-static
make
sudo make install

cd ..


git clone http://git.videolan.org/git/x264.git
cd x264
./configure --host=arm-unknown-linux-gnueabi --enable-static --disable-opencl
echo "Compiling x264"
make
sudo make install

cd ..

git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
sudo ./configure --arch=armel --target-os=linux --enable-gpl --enable-libx264 --enable-nonfree --enable-libtheora --enable-libvorbis
echo "Compiling ffmpeg"
make
sudo make install

cd ..

