import 'package:flutter/material.dart';

void main() {
  runApp(const MyCirviaApp());
}

class MyCirviaApp extends StatelessWidget {
  const MyCirviaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MyCirvia',
      theme: ThemeData(useMaterial3: true),
      home: const Scaffold(
        body: Center(child: Text('MyCirvia Mobile')),
      ),
    );
  }
}
