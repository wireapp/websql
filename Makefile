EXTENSION_FUNCTIONS = extension-functions.c
EMCC = emcc
CFLAGS = -O2 -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_THREADSAFE=0 -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS

# When compiling to WASM, enabling memory-growth is not expected to make much of an impact, so we enable it for all builds
# Since tihs is a library and not a standalone executable, we don't want to catch unhandled Node process exceptions
# So, we do : `NODEJS_CATCH_EXIT=0`, which fixes issue: https://github.com/kripken/sql.js/issues/173 and https://github.com/kripken/sql.js/issues/262
# Use the SINGLE_FILE=1 option so we can bundle the .wasm within the JS
EMFLAGS = \
	--memory-init-file 0 \
	-s RESERVED_FUNCTION_POINTERS=64 \
	-s EXPORTED_FUNCTIONS=@exports/functions.json \
	-s EXTRA_EXPORTED_RUNTIME_METHODS=@exports/runtime_methods.json \
	-s SINGLE_FILE=1 \
	-s NODEJS_CATCH_EXIT=0 \
	-s FORCE_FILESYSTEM=1 \
	-s STACK_OVERFLOW_CHECK=2 \
	-lnodefs.js \
	-lidbfs.js \
	-lworkerfs.js \
	-lproxyfs.js

# TODO: Enable -s NODERAWFS=1 \

EMFLAGS_WASM = \
	-s WASM=1 \
	-s ALLOW_MEMORY_GROWTH=1

# Do not use Closure (--closure 1), instead use Webpack production optimizations since Module becomes undefined otherwise
EMFLAGS_OPTIMIZED= \
	-s INLINING_LIMIT=50 \
	-O3 \
	-Oz

EMFLAGS_DEBUG = \
	-s ASSERTIONS=1 \
	-s DEMANGLE_SUPPORT=1 \
	-s INLINING_LIMIT=10 \
	-O1

EMFLAGS_SECURE = \
	-D_FORTIFY_SOURCE=2 \
	-fPIE

BITCODE_FILES = .tmp/sqlite3.bc .tmp/extension-functions.bc

all: optimized debug

.PHONY: debug
debug: dist/websql-worker-debug.js

dist/websql-worker-debug.js: $(BITCODE_FILES) .tmp/api.js exports/functions.json exports/runtime_methods.json
	# Generate websql-worker-debug.js
	$(EMCC) $(EMFLAGS) $(EMFLAGS_DEBUG) $(EMFLAGS_SECURE) $(EMFLAGS_WASM) $(BITCODE_FILES) --pre-js .tmp/api.js -o $@

.PHONY: optimized
optimized: dist/websql-worker.js

dist/websql-worker.js: $(BITCODE_FILES) .tmp/api.js exports/functions.json exports/runtime_methods.json 
	# Generate websql-worker.js
	$(EMCC) $(EMFLAGS) $(EMFLAGS_OPTIMIZED) $(EMFLAGS_SECURE) $(EMFLAGS_WASM) $(BITCODE_FILES) --pre-js .tmp/api.js -o $@

.tmp/sqlite3.bc: sqleet/sqleet.c
	# Generate sqleet llvm bitcode from the submodule
	$(EMCC) $(CFLAGS) $(EMFLAGS_OPTIMIZED) $(EMFLAGS_SECURE) sqleet/sqleet.c -o $@

.tmp/extension-functions.bc: sqlite/$(EXTENSION_FUNCTIONS)
	# Generate extension-functions llvm bitcode
	$(EMCC) $(CFLAGS) $(EMFLAGS_OPTIMIZED) $(EMFLAGS_SECURE) -s LINKABLE=1 sqlite/$(EXTENSION_FUNCTIONS) -o $@

.PHONY: clean 
clean: 
	rm -rf .tmp/*.js dist/*	

.PHONY: clean-all
clean-all: 
	rm -rf .tmp/* dist/*
