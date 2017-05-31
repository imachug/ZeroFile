class ZeroOptional {
	constructor(page) {
		if(typeof page != "object" || !page instanceof ZeroPage) {
			throw new Error("page should be an instance of ZeroPage");
		}
		this.page = page;
	}

	readFile(file) {
		return this.page.cmd("fileGet", [
			file, // file
			true, // required (wait until file exists)
			"text", // text or base64
			5000 // timeout
		]).then(res => {
			if(res === null || res === false) {
				return Promise.reject("File doesn't exist: " + file);
			} else {
				return Promise.resolve(res);
			}
		});
	}
	getType(file) {
		if(file == "") {
			return Promise.reject("File doesn't exist: " + file);
		}

		let dir = file.split("/");
		let relative = dir.pop();
		dir = dir.join("/");

		return this.getFileList(dir)
			.then(res => {
				let found = res.find(f => f.path == relative);
				if(!found) {
					return Promise.reject("File doesn't exist: " + file);
				}

				return found.type;
			});
	}

	getFileList(directory, recursive) {
		return this.page.cmd("optionalFileList", [
			undefined,
			"time_downloaded DESC",
			100000
		]).then(files => {
			files = files
				.map(file => {
					if(file.inner_path.substr(0, directory.length + 1) == directory + "/") {
						file.inner_path = file.inner_path.substr(directory.length + 1);
						return file;
					} else if(directory == "") {
						return file;
					} else {
						return null;
					}
				})
				.filter(file => file);

			if(!recursive) {
				files = files
					.map(file => {
						let pos = file.inner_path.indexOf("/")
						file.type = pos == -1 ? "file" : "dir";
						if(pos != -1) {
							file.inner_path = file.inner_path.substr(0, pos);
						}
						return file;
					})
					.reduce((arr, cur) => {
						return arr.find(a => a.inner_path == cur.inner_path) ? arr : arr.concat(cur);
					}, [])
					.sort((a, b) => a.inner_path.localeCompare(b.inner_path));
			}

			return files
				.map(file => {
					return {
						path: file.inner_path,
						type: file.type,
						downloaded: !!file.is_downloaded,
						pinned: !!file.is_pinned
					};
				});
		});
	}
	readDirectory(dir, recursive) {
		return this.getFileList(dir, recursive)
			.then(files => files.map(file => file.path));
	}
};