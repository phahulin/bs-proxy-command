#!/usr/bin/env bash

# #### .ssh/config example ####
#
# Host bsapp-*
#     ....
#     ProxyCommand bs-proxy-command/bspc.sh "blockscout" "us-east-1" "bsapp-" "%h" "%p"
#
# #############################

set -u
set -e
set -o pipefail

bspc_aws_profile="$1"
bspc_region="$2"
bspc_prefix="$3"
bspc_hostname="$4"
bspc_port="$5"

[ -z "$bspc_aws_profile" ] && echo "AWS Profile is unset" && exit
[ -z "$bspc_region" ] && echo "AWS Region is unset" && exit
[ -z "$bspc_prefix" ] && echo "Hostname prefix is unset" && exit
[ -z "$bspc_hostname" ] && echo "Hostname is unset" && exit
[ -z "$bspc_port" ] && echo "Port is unset" && exit

bspc_ip="$( node . "$bspc_aws_profile" "$bspc_region" "$bspc_prefix" "$bspc_hostname" < /dev/tty)"
[ -z "$bspc_ip" ] && exit
exec nc "$bspc_ip" "$bspc_port"

