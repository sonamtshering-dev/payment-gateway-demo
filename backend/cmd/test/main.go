package main

import (
	"fmt"
	"strings"
	"github.com/upay/gateway/internal/utils"
)

func main() {
	id1 := utils.NewID()
	id2 := utils.NewID()
	id3 := utils.NewID()
	fmt.Println("=== UUID v7 ===")
	fmt.Println(id1)
	fmt.Println(id2)
	fmt.Println(id3)
	fmt.Printf("Time-ordered: %v\n\n", id1.String() < id2.String() && id2.String() < id3.String())

	fmt.Println("=== QR Code ===")
	qr, err := utils.GenerateQRBase64("upi://pay?pa=test@upi&pn=Merchant&am=100&cu=INR")
	if err != nil {
		fmt.Println("ERROR:", err)
		return
	}
	fmt.Printf("OK: %s...\n", qr[:60])
	fmt.Printf("Is PNG: %v\n", strings.HasPrefix(qr, "data:image/png;base64,"))
	fmt.Printf("Size: %d bytes\n", len(qr))
}
