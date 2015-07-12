/*
   Copyright (c) 2010 Joseph Turian
   Developed by Dmitriy Khudorozhkov

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Joseph Turian nor the names of its contributors
      may be used to endorse or promote products derived from this
      software without specific prior written permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
   IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
   THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
   PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JOSEPH TURIAN BE LIABLE FOR
   ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
   OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
   HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
   STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
   IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   POSSIBILITY OF SUCH DAMAGE.
*/

var savemytabs = {

	// Shortcuts:
	Cc: Components.classes,
	Ci: Components.interfaces,

	// Preference branch of extension:
	branch: null,

	// Initialization:
	init: function()
	{
		// Initialize preferences:
		var prefservice = this.Cc["@mozilla.org/preferences-service;1"].getService(this.Ci.nsIPrefService);
		this.branch = prefservice.getBranch("extensions.savemytabs.");

		// Prepare the first run:
		this.next();
	},

	// Saving the state of tabs:
	save: function()
	{
		// Check if this is a top-most window:
		var mediator = this.Cc["@mozilla.org/appshell/window-mediator;1"].getService(this.Ci.nsIWindowMediator);  

		if(window != mediator.getMostRecentWindow("navigator:browser"))
		{
			// It's not - deny saving:
			this.next();
			return;
		}

		var lines = [];
		var fileExt = "txt";

		// Cycle through the windows:
		var w = 1, t = 1;
		var browserEnumerator = mediator.getEnumerator("navigator:browser");  

		while(browserEnumerator.hasMoreElements())
		{
			var browserWin = browserEnumerator.getNext();
			var tabbrowser = browserWin.gBrowser;

			// Cycle through the tabs:
			var nbrowsers = tabbrowser.browsers.length;

			for(var i = 0; i < nbrowsers; i++)
			{
				var browser = tabbrowser.browsers[i];

				lines.push(("window #" + w + "/tab #" + (t++)) + "\t" + browser.currentURI.spec.replace("\t", " ") + "\t" + browser.contentDocument.title.replace("\t", " "));
			}

			++w;
			t = 1;
		}

		// Extract current date/time:
		function prepare(num)
		{
			var str = String(num);

			if(str.length < 2)
				str = "0" + str;

			return str;
		}

		var today = new Date();
		var yyyy = today.getFullYear();
		var mm = today.getMonth() + 1;
		var dd = today.getDate();
		var hh = today.getHours();
		var min = today.getMinutes();

		// Get the directory to save to:
		var filePath = null;
		var file = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
		var dir = this.branch.getCharPref("directory");

		switch(dir)
		{
			case "Profile":
				filePath = this.Cc["@mozilla.org/file/directory_service;1"].getService(this.Ci.nsIProperties).get("ProfD", this.Ci.nsIFile);
				file.initWithPath( filePath.path );
				break;

			case "Home":
				filePath = this.Cc["@mozilla.org/file/directory_service;1"].getService(this.Ci.nsIProperties).get("Home", this.Ci.nsIFile);
				file.initWithPath( filePath.path );				
				break;

			default:
				filePath = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
				file.initWithPath(dir);
		}
		
		//Create copy of "file" - the save directory
		//See: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFile#clone%28%29
		var saveDir = file.clone();
		
		if(file && file.exists())
		{
			file.append("opentabs-" + this.getUserName() + "-" + String(yyyy) + prepare(mm) + prepare(dd) + "-" + prepare(hh) + prepare(min) + "." + fileExt);

			// Create file output stream:
			var foStream = this.Cc["@mozilla.org/network/file-output-stream;1"].createInstance(this.Ci.nsIFileOutputStream);

			// Write, create, truncate:
			foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

			// Be sure to write Unicode:
			var converter = this.Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(this.Ci.nsIConverterOutputStream);
			converter.init(foStream, "UTF-8", 0, 0);
			converter.writeString(lines.join("\r\n"));
			converter.close();
			
			//If saved the file, cehck for deletions
			this.removeOldFiles( saveDir, fileExt );
		}

		// Prepare for the next iteration:
		this.next();
	},

	next: function()
	{
		var that = this;

		setTimeout(function()
		{
			that.save();
		},
		this.branch.getIntPref("period") * 60 * 1000);
	},

	getUserName: function()
	{
		var env = this.Cc["@mozilla.org/process/environment;1"].getService(this.Ci.nsIEnvironment);
		var user = "";

		if(env.exists("computername"))
			user = env.get('computername');

		if(!user.length)
			if(env.exists("username"))
				user = env.get('username');

		if(!user.length)
			if(env.exists("user"))
				user = env.get('user');

		return user;
	},
	
	removeOldFiles: function( saveDir, fileExt)
	{
		var timeToDeleteFiles_min = this.branch.getIntPref("clearperiod");
		var dir = this.branch.getCharPref("directory");
		var children = saveDir.directoryEntries;
		var child;
		var list2 = [];
		var childStr;
		var childArray = [];
		var currDate, currYear, currMonth, currDay;
		var currTime, currHour, currMin;
		var extStr;
		var today = new Date();
		//alert("About to enter loop with ext = " + fileExt);
		while (children.hasMoreElements()) 
		{
			child = children.getNext().QueryInterface(Components.interfaces.nsILocalFile);
			childStr = child.leafName;
			
			//Get the extension
			extStr = childStr.split(".")[1];
			if ( extStr.localeCompare(fileExt) != 0 )
			{
				//then not the correct type of file (html or txt), so skip it
				continue;
			}
			
			//to split based on the "-", .split
			childArray = childStr.split(".")[0].split("-");
			
			//Now check that the first element is "opentabs"
			if ( childArray[0].localeCompare("opentabs") != 0 )
			{
				//then not a valid match, so ignore the file
				continue;
			}
			
			//Then the last parts are date and time and extension. So check if they are beyond the limit date.
			currDate = childArray[childArray.length-2];
			currTime = childArray[childArray.length-1];
			
			//convert the date and time into separate parts that can be used to create a date object
			currYear =	parseInt( currDate.substring(0,4), 10 ); 
			currMonth =	parseInt( currDate.substring(4,6), 10 )-1;  
			currDay = 	parseInt( currDate.substring(6,8), 10 ); 
			currHour = 	parseInt( currTime.substring(0,2), 10 ); 
			currMin = 	parseInt( currTime.substring(2,4), 10 ); 
			
			var currFileDate = new Date(currYear, currMonth, currDay, currHour, currMin, 0, 0);
			var timeDiff_ms = (today.getTime() - currFileDate.getTime())/(60*1000);
			
			if ( (today.getTime() - currFileDate.getTime()) > timeToDeleteFiles_min*60*1000 && timeToDeleteFiles_min > 0 ) 
			{
				//Then delete the file
				var fileDel = saveDir.clone(); //this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
				fileDel.append(childStr);
				
				if (fileDel.exists())
				{
					fileDel.remove(false);
				}
			}
		} //end of while looping over files
	}
};

window.addEventListener("load", function() { savemytabs.init(); }, false);