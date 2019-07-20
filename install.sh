#!/usr/bin/env bash

# This is part of a larger script for setting a mac for python development.
set -e

# Shared functions

pretty_print() {
  printf "\n%b\n" "$1"
}

# So it begins

# Homebrew installation
if ! command -v brew &>/dev/null; then
  pretty_print "Installing Homebrew, an OSX package manager, follow the instructions..."
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

  if ! grep -qs "recommended by brew doctor" ~/.zshrc; then
    pretty_print "Put Homebrew location earlier in PATH ..."
      printf '\n# recommended by brew doctor\n' >> ~/.zshrc
      printf 'export PATH="/usr/local/bin:$PATH"\n' >> ~/.zshrc
      export PATH="/usr/local/bin:$PATH"
  fi
else
  pretty_print "You already have Homebrew installed...good job!"
fi

# NodeJS Installation
if ! command -v node &>/dev/null; then
  pretty_print "Installing NodeJS"
    brew install node@10
else
  pretty_print "You already have Node installed...good job!"
fi

pretty_print "Installing package"
  npm install
