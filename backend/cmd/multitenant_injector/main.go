package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"log"
	"os"
	"strings"
)

func main() {
	dir := "../../internal/domain"
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, dir, nil, parser.ParseComments)
	if err != nil {
		log.Fatal(err)
	}

	for _, pkg := range pkgs {
		for filename, f := range pkg.Files {
			// Skip tenant.go to avoid injecting TenantBase into Tenant or TenantBase itself.
			// Skip interface files or repo files
			if strings.HasSuffix(filename, "tenant.go") || strings.HasSuffix(filename, "repo.go") {
				continue
			}

			modified := false
			ast.Inspect(f, func(n ast.Node) bool {
				switch x := n.(type) {
				case *ast.TypeSpec:
					if st, ok := x.Type.(*ast.StructType); ok {
						// Skip interfaces masquerading as structs or something, but usually TypeSpec catches real structs.
						// Check if TenantBase is already embedded
						hasTenantBase := false
						if st.Fields != nil {
							for _, field := range st.Fields.List {
								if len(field.Names) == 0 {
									// Anonymous field
									if ident, ok := field.Type.(*ast.Ident); ok && ident.Name == "TenantBase" {
										hasTenantBase = true
										break
									}
								}
							}
						}

						if !hasTenantBase {
							// Inject TenantBase at the beginning
							newField := &ast.Field{
								Type: &ast.Ident{Name: "TenantBase"},
							}
							if st.Fields == nil {
								st.Fields = &ast.FieldList{}
							}
							st.Fields.List = append([]*ast.Field{newField}, st.Fields.List...)
							modified = true
						}
					}
				}
				return true
			})

			if modified {
				var buf bytes.Buffer
				if err := format.Node(&buf, fset, f); err != nil {
					log.Printf("Failed to format %s: %v", filename, err)
					continue
				}
				if err := os.WriteFile(filename, buf.Bytes(), 0644); err != nil {
					log.Printf("Failed to write %s: %v", filename, err)
				} else {
					fmt.Printf("Updated %s\n", filename)
				}
			}
		}
	}
}
