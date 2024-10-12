ln -s ../.prettierignore
ln -s ../.prettierrc
ln -s ../eslint.config.mjs

# link one or the other
ln -s ../vitest.config.ts
ln -s ../jest.config.ts 

echo '{
	"extends": "../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist"
    },
    "exclude": [
        "node_modules",
        "dist"
    ]
}' | jq '.' > tsconfig.json

echo 'node_modules
.idea
.DS_Store

lib

.vscode

*dist
*lib' > .gitignore

mkdir controllers
mkdir interfaces
mkdir middleware
mkdir models
mkdir routes
mkdir services
mkdir utils