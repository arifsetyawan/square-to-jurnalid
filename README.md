# square-to-jurnalid
Converting Squareup Sales Report to Jurnal Indonesia sales data
- square --> https://squareup.com (Free POS System)
- jurnalid --> https://jurnal.id (Accounting Software)

## installation
open terminal and go to this project directory and run command
```
chmod +x ./install.sh
```
after that do command
```
./install.sh
```
Wait until all instalation process complete. This installation will perform 
1. Installing homebrew
2. Installing nodejs

## Using the program
- Before running, please do set all the config in the config directory. each file file need to be renamed to `*.config.json`. i.e : `square.config-sample.json` to `square.config.json`
- File `asset/square_jurnal_menu_list.csv` is the menu mapping between square and jurnalid to your set.
- After all config are correct. we have run.js as executeable by performing:
    ```
    node run.js
    ```
    this will get square report on the current date.
- After execution, run.js will write report to jurnal_csv_result folder.

## Options
run.js accept option :
```
-d --> day of the month.
-m --> month of the year
-y --> year
```
example :
```
# this will get on date 4 on current Month of Year
node run.js -d 4
```
```
# this will get on date 4 on January on current Year
node run.js -d 4 -m 1
```
