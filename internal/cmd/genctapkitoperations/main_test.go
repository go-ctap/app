package main

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestGeneratedOperationsAreCurrentAndDeterministic(t *testing.T) {
	serviceDir, err := packageDir(serviceImportPath)
	if err != nil {
		t.Fatal(err)
	}

	generated, err := generate(serviceDir)
	if err != nil {
		t.Fatal(err)
	}
	generatedAgain, err := generate(serviceDir)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(generated, generatedAgain) {
		t.Fatal("generator output is not deterministic")
	}

	root, err := moduleRoot()
	if err != nil {
		t.Fatal(err)
	}
	checkedIn, err := os.ReadFile(filepath.Join(root, "ctapkit_operations.go"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(generated, checkedIn) {
		t.Fatal("ctapkit_operations.go is stale; run go generate")
	}
}

func moduleRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		} else if !os.IsNotExist(err) {
			return "", err
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}
